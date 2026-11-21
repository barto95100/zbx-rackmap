<?php declare(strict_types = 0);

namespace Modules\Rackmap\Actions;

require_once __DIR__.'/../lib/Store.php';

use CController,
	CControllerResponseData,
	Modules\Rackmap\Lib\Store;

/** Enregistre (ou supprime) une baie. POST + jeton CSRF, réservé aux admins Zabbix. */
class RackmapSave extends CController {

	protected function init(): void {
		$this->setPostContentType(self::POST_CONTENT_TYPE_FORM);
	}

	protected function checkInput(): bool {
		$ok = $this->validateInput(['payload' => 'string', 'delete' => 'id']);

		if (!$ok) {
			$this->respond(['ok' => false, 'error' => 'invalid input']);
		}

		return $ok;
	}

	protected function checkPermissions(): bool {
		return $this->getUserType() >= USER_TYPE_ZABBIX_ADMIN;
	}

	protected function doAction(): void {
		try {
			if ($this->hasInput('delete')) {
				Store::delete((int) $this->getInput('delete'));
				$this->respond(['ok' => true]);
				return;
			}

			$rack = json_decode((string) $this->getInput('payload', ''), true);

			if (!is_array($rack)) {
				throw new \InvalidArgumentException('payload');
			}

			$this->respond(['ok' => true, 'id' => Store::save($rack)]);
		}
		catch (\Throwable $e) {
			$this->respond(['ok' => false, 'error' => $e->getMessage()]);
		}
	}

	private function respond(array $payload): void {
		$this->setResponse(new CControllerResponseData([
			'main_block' => json_encode($payload, JSON_UNESCAPED_UNICODE)
		]));
	}
}
