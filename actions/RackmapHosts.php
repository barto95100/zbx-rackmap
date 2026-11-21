<?php declare(strict_types = 0);

namespace Modules\Rackmap\Actions;

use API,
	CController,
	CControllerResponseData;

/** Liste des hôtes visibles par l'utilisateur (pour associer un équipement à un hôte dans l'éditeur). */
class RackmapHosts extends CController {

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		return true;
	}

	protected function checkPermissions(): bool {
		return $this->getUserType() >= USER_TYPE_ZABBIX_ADMIN;
	}

	protected function doAction(): void {
		try {
			$hosts = API::Host()->get([
				'output' => ['hostid', 'name'],
				'sortfield' => 'name',
				'limit' => 5000
			]);
		}
		catch (\Throwable $e) {
			$hosts = [];
		}

		$list = array_map(static fn($h) => ['id' => (string) $h['hostid'], 'name' => (string) $h['name']], $hosts);

		$this->setResponse(new CControllerResponseData([
			'main_block' => json_encode(['hosts' => $list], JSON_UNESCAPED_UNICODE)
		]));
	}
}
