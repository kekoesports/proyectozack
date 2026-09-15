"""Install only the public landing SEO routes; preserve the existing proxy config.

Usage on the VPS: python3 caddy-seo.py /opt/socialpro/n8n/Caddyfile
The sibling backup and candidate contain private configuration: mode 0600.
"""
import argparse
import datetime
import os
from pathlib import Path
import subprocess
import urllib.request
import xml.etree.ElementTree as ET

DOMAINS = {'kekopilot.com': ['/', '/en'], 'live.socialpro.es': ['/']}
CONTAINER = 'socialpro-automation-caddy-1'


def bodies(domain):
    robots = f'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: https://{domain}/sitemap.xml'
    urls = ''.join(f'<url><loc>https://{domain}{path}</loc></url>' for path in DOMAINS[domain])
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>'
    return {'robots.txt': ('text/plain; charset=utf-8', robots), 'sitemap.xml': ('application/xml; charset=utf-8', sitemap)}


def transform(source):
    if '# BEGIN PUBLIC LANDING SEO' in source:
        raise ValueError('SEO routes already installed; inspect before changing them')
    for domain in DOMAINS:
        marker = domain + ' {\n'
        if source.count(marker) != 1:
            raise ValueError('Expected exactly one host block: ' + domain)
        start = source.index(marker) + len(marker)
        # KekoPilot uses an ordered route and a final deny handler.
        if domain == 'kekopilot.com':
            route = source.index('\troute {\n', start)
            if route > source.index('\n}', start):
                raise ValueError('Missing ordered public route')
            start = route + len('\troute {\n')
        snippet = '\n\t# BEGIN PUBLIC LANDING SEO\n'
        for name, (content_type, body) in bodies(domain).items():
            snippet += f'\thandle /{name} {{\n\t\theader Content-Type "{content_type}"\n\t\trespond <<SEO\n'
            snippet += ''.join('\t\t\t' + line + '\n' for line in body.splitlines())
            snippet += '\t\t\tSEO 200\n\t}\n'
        snippet += '\t# END PUBLIC LANDING SEO\n'
        source = source[:start] + snippet + source[start:]
    return source


def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        # Caddy diagnostics may include private config; never echo them.
        raise RuntimeError('Caddy validation/reload failed; private diagnostics withheld')


def write_config(path, content):
    # The existing deployment identity manages Docker, not host-root files.
    result = subprocess.run([
        'docker', 'run', '--rm', '-i', '--network', 'none', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--entrypoint', 'sh', '--mount', 'type=bind,src=' + str(path.resolve()) + ',dst=/target',
        'caddy:2-alpine', '-c', 'cat > /target',
    ], input=content, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('Could not write the existing Caddy bind mount')


def verify():
    for domain in DOMAINS:
        for name, (content_type, body) in bodies(domain).items():
            with urllib.request.urlopen(f'https://{domain}/{name}', timeout=20) as response:
                assert response.status == 200
                assert response.headers['Content-Type'].startswith(content_type.split(';')[0])
                actual = response.read().decode().strip()
                assert actual == body
                if name.endswith('.xml'):
                    ET.fromstring(actual)
        for path in DOMAINS[domain]:
            with urllib.request.urlopen(f'https://{domain}{path}', timeout=20) as response:
                assert response.status == 200


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config', type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    original = args.config.read_text()
    updated = transform(original)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    private = Path.home() / '.config/socialpro/public-seo-20260915'
    private.mkdir(parents=True, exist_ok=True, mode=0o700)
    backup = private / ('Caddyfile.before-public-seo-' + stamp)
    backup.write_text(original)
    candidate = private / 'Caddyfile.public-seo-candidate'
    candidate.write_text(updated)
    run(['docker', 'cp', str(candidate), CONTAINER + ':/tmp/public-seo-candidate'])
    run(['docker', 'exec', CONTAINER, 'caddy', 'validate', '--config', '/tmp/public-seo-candidate', '--adapter', 'caddyfile'])
    try:
        # Preserve inode: the container bind-mounts this exact file.
        write_config(args.config, updated)
        run(['docker', 'exec', CONTAINER, 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'])
        verify()
    except Exception:
        write_config(args.config, original)
        run(['docker', 'exec', CONTAINER, 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'])
        raise
    print('Verified: public robots, XML sitemaps and landing pages. Backup: ' + str(backup))


if __name__ == '__main__':
    main()
