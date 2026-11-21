<?php declare(strict_types = 0);

namespace Modules\Rackmap;

use APP,
	CMenuItem,
	Zabbix\Core\CModule;

class Module extends CModule {

	public function init(): void {
		APP::Component()->get('menu.main')
			->findOrAdd(_('Monitoring'))
			->getSubmenu()
			->add(
				(new CMenuItem(_('Rackmap')))
					->setAction('rackmap.view')
					->setAliases(['rackmap.data', 'rackmap.save', 'rackmap.hosts', 'rackmap.host'])
			);
	}
}
