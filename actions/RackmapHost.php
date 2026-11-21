<?php declare(strict_types = 0);

namespace Modules\Rackmap\Actions;

use API,
	CController,
	CControllerResponseData;

/**
 * Détails d'un hôte pour le panneau latéral : interfaces, groupes, problèmes actifs, métriques et graphiques.
 * Même contenu que le panneau de Cablemap, sans la notion de lien montant.
 */
class RackmapHost extends CController {

	private const METRICS = [
		['label' => 'Uptime', 'search' => ['system.uptime', 'sysUpTime']],
		['label' => 'CPU', 'search' => ['system.cpu.util', 'system.cpu.load']],
		['label' => 'Memory', 'search' => ['vm.memory.utilization', 'vm.memory.size[pavailable']],
		['label' => 'Latency', 'search' => ['icmppingsec']],
		['label' => 'Packet loss', 'search' => ['icmppingloss']]
	];

	private const GRAPHS = [
		['label' => 'CPU', 'search' => ['system.cpu.util', 'system.cpu.load[all,avg1]']],
		['label' => 'Memory', 'search' => ['vm.memory.utilization']],
		['label' => 'Latency', 'search' => ['icmppingsec']]
	];

	private const GRAPH_MINUTES = 60;

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		$ret = $this->validateInput(['hostid' => 'required|db hosts.hostid']);

		if (!$ret) {
			$this->respond(['error' => 'Invalid host']);
		}

		return $ret;
	}

	protected function checkPermissions(): bool {
		return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
	}

	private function respond(array $data): void {
		$this->setResponse(new CControllerResponseData([
			'main_block' => json_encode($data, JSON_UNESCAPED_UNICODE)
		]));
	}

	protected function doAction(): void {
		$hostid = (string) $this->getInput('hostid');

		$hosts = API::Host()->get([
			'output' => ['hostid', 'name', 'status', 'maintenance_status'],
			'hostids' => [$hostid],
			'selectHostGroups' => ['name'],
			'selectInterfaces' => ['ip', 'dns', 'port', 'type', 'useip', 'available']
		]);

		if (!$hosts) {
			$this->respond(['error' => 'Host not found']);
			return;
		}

		$h = $hosts[0];
		$problems = [];

		foreach (API::Problem()->get([
			'output' => ['eventid', 'name', 'severity', 'clock', 'acknowledged'],
			'hostids' => [$hostid],
			'sortfield' => ['eventid'],
			'sortorder' => 'DESC',
			'limit' => 15
		]) as $p) {
			$problems[] = [
				'name' => $p['name'],
				'severity' => (int) $p['severity'],
				'clock' => (int) $p['clock'],
				'acknowledged' => $p['acknowledged'] === '1'
			];
		}

		$dashboardid = null;

		try {
			$dashboards = API::HostDashboard()->get(['output' => ['dashboardid'], 'hostids' => [$hostid], 'limit' => 1]);
			if ($dashboards) {
				$dashboardid = $dashboards[0]['dashboardid'];
			}
		}
		catch (\Throwable $e) {
			$dashboardid = null;
		}

		$this->respond([
			'hostid' => $h['hostid'],
			'dashboardid' => $dashboardid,
			'name' => $h['name'],
			'maintenance' => $h['maintenance_status'] === '1',
			'groups' => array_column($h['hostgroups'], 'name'),
			'interfaces' => $h['interfaces'],
			'problems' => $problems,
			'metrics' => $this->metrics($hostid),
			'graphs' => $this->graphs($hostid)
		]);
	}

	/** Première valeur trouvée pour chaque entrée de METRICS. */
	private function metrics(string $hostid): array {
		$needles = [];

		foreach (self::METRICS as $def) {
			foreach ($def['search'] as $n) {
				$needles[] = $n;
			}
		}

		$items = API::Item()->get([
			'output' => ['key_', 'name', 'lastvalue', 'units'],
			'hostids' => [$hostid],
			'search' => ['key_' => $needles],
			'searchByAny' => true,
			'filter' => ['status' => 0]
		]);

		$metrics = [];

		foreach (self::METRICS as $def) {
			foreach ($def['search'] as $needle) {
				foreach ($items as $it) {
					if ($it['lastvalue'] !== '' && stripos($it['key_'], $needle) !== false) {
						$metrics[] = ['label' => $def['label'], 'lastvalue' => $it['lastvalue'], 'units' => $it['units']];
						continue 3;
					}
				}
			}
		}

		return $metrics;
	}

	/** Jusqu'à 3 graphiques (60 points sur GRAPH_MINUTES) : CPU, mémoire, latence selon les items disponibles. */
	private function graphs(string $hostid): array {
		$buckets = 60;
		$to = time();
		$from = $to - self::GRAPH_MINUTES * 60;
		$out = [];

		foreach (self::GRAPHS as $def) {
			foreach ($def['search'] as $needle) {
				$it = self::findItem($hostid, $needle);

				if ($it === null) {
					continue;
				}

				$vals = self::bucketHistory($it['itemid'], (int) $it['value_type'], $from, $to, $buckets);

				if (self::hasData($vals)) {
					$out[] = ['type' => 'metric', 'label' => $def['label'], 'units' => $it['units'], 'values' => $vals,
						'minutes' => self::GRAPH_MINUTES, 'from' => $from, 'to' => $to];
					break;
				}
			}
		}

		return $out;
	}

	private static function bucketHistory(string $itemid, int $value_type, int $from, int $to, int $buckets): array {
		$series = array_fill(0, $buckets, null);
		$step = ($to - $from) / $buckets;
		$rows = API::History()->get([
			'output' => ['clock', 'value'],
			'history' => $value_type,
			'itemids' => [$itemid],
			'time_from' => $from,
			'sortfield' => 'clock',
			'sortorder' => 'ASC',
			'limit' => 5000
		]);
		$sum = array_fill(0, $buckets, 0.0);
		$cnt = array_fill(0, $buckets, 0);

		foreach ($rows as $r) {
			$i = min($buckets - 1, max(0, (int) floor(((int) $r['clock'] - $from) / $step)));
			$sum[$i] += (float) $r['value'];
			$cnt[$i]++;
		}

		for ($i = 0; $i < $buckets; $i++) {
			if ($cnt[$i] > 0) {
				$series[$i] = $sum[$i] / $cnt[$i];
			}
		}

		return $series;
	}

	private static function hasData(array $series): bool {
		foreach ($series as $v) {
			if ($v !== null) {
				return true;
			}
		}

		return false;
	}

	/** Item numérique de l'hôte : clé exacte en priorité, sinon premier item dont la clé contient $needle. */
	private static function findItem(string $hostid, string $needle): ?array {
		$params = [
			'output' => ['itemid', 'key_', 'name', 'units', 'value_type', 'lastvalue'],
			'hostids' => [$hostid],
			'filter' => ['status' => 0, 'value_type' => [0, 3], 'key_' => $needle]
		];

		foreach (API::Item()->get($params) as $it) {
			if ($it['lastvalue'] !== '') {
				return $it;
			}
		}

		unset($params['filter']['key_']);
		$params['search'] = ['key_' => $needle];
		$params['limit'] = 30;

		foreach (API::Item()->get($params) as $it) {
			if ($it['lastvalue'] !== '') {
				return $it;
			}
		}

		return null;
	}
}
