<?php declare(strict_types = 0);

namespace Modules\Rackmap\Actions;

require_once __DIR__.'/../lib/Lang.php';

use CController,
	CControllerResponseData,
	CCsrfTokenHelper,
	Modules\Rackmap\Lib\Lang;

class RackmapView extends CController {

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
		$this->setResponse(new CControllerResponseData([
			'title' => _('Rackmap'),
			'js_config' => [
				'refresh' => 30,
				'can_edit' => $this->getUserType() >= USER_TYPE_ZABBIX_ADMIN,
				'csrf' => CCsrfTokenHelper::get('rackmap.save'),
				'labels' => Lang::labels(Lang::userLang())
			]
		]));
	}
}
