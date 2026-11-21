<?php declare(strict_types = 0);

namespace Modules\Rackmap\Lib;

/** Traductions : lang/<xx>.json selon la langue de l'utilisateur Zabbix ; sinon l'anglais intégré au JS. */
class Lang {

	public static function userLang(): string {
		if (method_exists('CWebUser', 'getLang')) {
			$lang = (string) \CWebUser::getLang();
		}
		else {
			$lang = (string) (\CWebUser::$data['lang'] ?? 'en_US');
		}

		return strtolower(preg_replace('/[^A-Za-z_]/', '', $lang));
	}

	public static function labels(string $lang): array {
		$dir = dirname(__DIR__).'/lang/';
		$out = [];

		foreach (array_unique([substr($lang, 0, 2), $lang]) as $code) {
			if ($code === '' || !is_file($dir.$code.'.json')) {
				continue;
			}
			$data = json_decode((string) file_get_contents($dir.$code.'.json'), true);
			if (is_array($data)) {
				$out = array_replace($out, $data);
			}
		}

		return $out;
	}
}
