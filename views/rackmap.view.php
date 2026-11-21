<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

(new CHtmlPage())
	->setTitle($data['title'])
	->addItem((new CDiv())->setId('rackmap'))
	->show();

(new CScriptTag(
	'window.RACKMAP_CFG = '.json_encode($data['js_config'], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG).';'
))->show();
(new CScriptTag(file_get_contents(__DIR__.'/../assets/js/rackmap.js')))->show();
