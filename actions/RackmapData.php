<?php declare(strict_types = 0);

namespace Modules\Rackmap\Actions;

require_once __DIR__.'/../lib/Store.php';

use API,
	CController,
	CControllerResponseData,
	Modules\Rackmap\Lib\Store;

/** Baies + statut en direct des hôtes associés (JSON). */
class RackmapData extends CController {

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		return true;
	}

	protected function checkPermissions(): bool {
		return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
	}

	protected function doAction(): void {
		if (!Store::ready()) {
			$this->respond(['ready' => false, 'racks' => [], 'hosts' => new \stdClass(), 'time' => time()]);
			return;
		}

		$racks = Store::all();
		$hostids = [];

		foreach ($racks as $rack) {
			foreach ($rack['devices'] as $d) {
				if ($d['hostid'] !== null) {
					$hostids[$d['hostid']] = $d['hostid'];
				}
			}
		}

		$this->respond(['ready' => true, 'racks' => $racks, 'hosts' => (object) $this->hostStatus(array_values($hostids)),
			'traffic' => (object) $this->traffic($racks, array_values($hostids)), 'time' => time()]);
	}

	/**
	 * Par hôte : state = ok | problem | down | disabled | unknown, severity max (0..5) et nombre de problèmes.
	 */
	private function hostStatus(array $hostids): array {
		if (!$hostids) {
			return [];
		}

		$out = [];

		try {
			$hosts = API::Host()->get([
				'output' => ['hostid', 'name', 'status'],
				'hostids' => $hostids,
				'selectInterfaces' => ['available'],
				'preservekeys' => true
			]);

			$triggers = API::Trigger()->get([
				'output' => ['triggerid', 'priority'],
				'hostids' => $hostids,
				'selectHosts' => ['hostid'],
				'monitored' => true,
				'only_true' => true,
				'skipDependent' => true,
				'filter' => ['value' => 1]
			]);
		}
		catch (\Throwable $e) {
			return [];
		}

		$sev = [];
		$cnt = [];

		foreach ($triggers as $t) {
			foreach ($t['hosts'] as $h) {
				$sev[$h['hostid']] = max($sev[$h['hostid']] ?? 0, (int) $t['priority']);
				$cnt[$h['hostid']] = ($cnt[$h['hostid']] ?? 0) + 1;
			}
		}

		foreach ($hosts as $id => $h) {
			$avail = array_column($h['interfaces'], 'available');
			$state = 'ok';

			if ((int) $h['status'] === HOST_STATUS_NOT_MONITORED) {
				$state = 'disabled';
			}
			elseif (isset($cnt[$id])) {
				$state = 'problem';
			}
			elseif (in_array(INTERFACE_AVAILABLE_FALSE, array_map('intval', $avail), true)) {
				$state = 'down';
			}
			elseif ($avail && !in_array(INTERFACE_AVAILABLE_TRUE, array_map('intval', $avail), true)) {
				$state = 'unknown';
			}

			$out[(string) $id] = ['name' => $h['name'], 'state' => $state, 'severity' => $sev[$id] ?? -1,
				'problems' => $cnt[$id] ?? 0];
		}

		return $out;
	}

	/**
	 * Débits (bit/s) par câble, lus sur les items net.if.in[...] / net.if.out[...] des hôtes liés.
	 * Le port (ou l'interface saisie) est comparé aux paramètres de la clé : "ifHCInOctets.5", "eth0"...
	 * 'ab' = trafic de A vers B, 'ba' = de B vers A. Aucun item trouvé : le câble reste statique.
	 *
	 * @return array<string, array{ab: float|null, ba: float|null}>
	 */
	private function traffic(array $racks, array $hostids): array {
		if (!$hostids) {
			return [];
		}

		try {
			$items = API::Item()->get([
				'output' => ['hostid', 'key_', 'lastvalue'],
				'hostids' => $hostids,
				'search' => ['key_' => 'net.if.'],
				'filter' => ['status' => 0, 'value_type' => [0, 3]],
				'limit' => 20000
			]);
		}
		catch (\Throwable $e) {
			return [];
		}

		$tokens = [];

		foreach ($items as $it) {
			if ($it['lastvalue'] === '' || !preg_match('/^net\.if\.(in|out)\[(.*)\]$/', $it['key_'], $m)) {
				continue;
			}

			foreach (explode(',', $m[2]) as $param) {
				$param = strtolower(trim(trim($param), '"\''));
				$parts = array_unique(array_filter([$param, substr($param, ((int) strrpos($param, '.')) + (strpos($param, '.') !== false ? 1 : 0))]));

				foreach ($parts as $p) {
					$cur = $tokens[$it['hostid']][$p][$m[1]] ?? 0.0;
					$tokens[$it['hostid']][$p][$m[1]] = max($cur, (float) $it['lastvalue']);
				}
			}
		}

		$hostOf = [];

		foreach ($racks as $rack) {
			foreach ($rack['devices'] as $d) {
				$hostOf[$d['id']] = $d['hostid'];
			}
		}

		$find = static function (?string $hostid, string $port, string $iface) use ($tokens): ?array {
			$token = strtolower(trim($iface !== '' ? $iface : $port));

			return ($hostid !== null && $token !== '') ? ($tokens[$hostid][$token] ?? null) : null;
		};

		$out = [];

		foreach ($racks as $rack) {
			foreach ($rack['links'] as $l) {
				$a = $find($hostOf[$l['a']] ?? null, (string) $l['a_port'], (string) ($l['a_iface'] ?? ''));
				$b = $find($hostOf[$l['b']] ?? null, (string) $l['b_port'], (string) ($l['b_iface'] ?? ''));
				$ab = $a['out'] ?? ($b['in'] ?? null);
				$ba = $a['in'] ?? ($b['out'] ?? null);

				if ($ab !== null || $ba !== null) {
					$out[(string) $l['id']] = ['ab' => $ab, 'ba' => $ba];
				}
			}
		}

		return $out;
	}

	private function respond(array $payload): void {
		$this->setResponse(new CControllerResponseData([
			'main_block' => json_encode($payload, JSON_UNESCAPED_UNICODE)
		]));
	}
}
