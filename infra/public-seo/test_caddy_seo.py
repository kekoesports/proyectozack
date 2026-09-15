"""Isolated regression checks: do not contact or mutate a running proxy."""
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('landing_seo', Path(__file__).with_name('caddy-seo.py'))
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)

SOURCE = '''app.kekopilot.com {
	basic_auth { private-account private-hash }
	reverse_proxy private:3000
}
kekopilot.com {
	route {
		@home path /
		rewrite @home /kekopilot
		handle { respond "Not found" 404 }
	}
}
www.kekopilot.com { redir https://kekopilot.com{uri} permanent }
live.socialpro.es {
	reverse_proxy landing-web:80
}
'''


class LandingSeoTest(unittest.TestCase):
    def test_preserves_every_existing_line_and_private_host(self):
        result = seo.transform(SOURCE)
        restored = seo.re.sub(r'\n\t# BEGIN PUBLIC LANDING SEO\n.*?\t# END PUBLIC LANDING SEO\n', '', result, flags=seo.re.DOTALL)
        self.assertEqual(restored, SOURCE)
        self.assertTrue(result.startswith(SOURCE.split('kekopilot.com {\n', 2)[0]))

    def test_keko_handlers_precede_deny(self):
        result = seo.transform(SOURCE)
        self.assertLess(result.index('handle /robots.txt'), result.index('@home path'))
        self.assertEqual(result.count('handle /sitemap.xml'), 2)

    def test_duplicate_application_fails_closed(self):
        with self.assertRaises(ValueError):
            seo.transform(seo.transform(SOURCE))

    def test_missing_public_host_fails_closed(self):
        with self.assertRaises(ValueError):
            seo.transform(SOURCE.replace('\nkekopilot.com {', '\nother.com {'))

    def test_sitemaps_only_include_public_canonical_pages(self):
        for domain, paths in seo.DOMAINS.items():
            body = seo.bodies(domain)['sitemap.xml'][1]
            root = ET.fromstring(body)
            urls = [node.text for node in root.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
            self.assertEqual(urls, ['https://' + domain + path for path in paths])


if __name__ == '__main__':
    unittest.main()
