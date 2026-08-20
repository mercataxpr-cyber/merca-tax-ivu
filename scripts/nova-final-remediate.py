from pathlib import Path
import subprocess

REPORT_LOGO = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'


def replace_once(path_name, old, new, label):
    path = Path(path_name)
    source = path.read_text(encoding='utf-8')
    if new in source:
        print(f'ALREADY: {label}')
        return
    if old not in source:
        raise SystemExit(f'FAIL CLOSED: {label} anchor not found')
    path.write_text(source.replace(old, new, 1), encoding='utf-8')
    print(f'UPDATED: {label}')


# Presentation-only report branding in vNext. Legacy report calculations remain the source of data.
vnext = Path('src/mobile-vnext-ui.js')
source = vnext.read_text(encoding='utf-8')
if 'function installReportBranding()' not in source:
    anchor = "  function wrapRender(){if(root.render?.__vxWrapped)return;const legacy=root.render;if(typeof legacy!=='function')return;const wrapped=function(...args){const out=legacy.apply(this,args);renderAll();return out;};wrapped.__vxWrapped=true;root.render=wrapped;}"
    if anchor not in source:
        raise SystemExit('FAIL CLOSED: vNext wrapRender anchor not found')
    branding = '''  const REPORT_LOGO_PATH='ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';

  function installReportBranding(){
    if(typeof root.reportHtml!=='function'||root.reportHtml.__vxBranded)return;
    const legacyReportHtml=root.reportHtml;
    const branded=function(sales){
      return legacyReportHtml(sales)
        .replace('<div class="head"><img class="logo" src="assets/logo.png"><div class="title">',`<div class="head"><div class="brandBlock"><img class="logo" src="${REPORT_LOGO_PATH}" alt="MercaTax IVU PR"><div class="brandCopy"><strong>MercaTax IVU PR</strong><span>Organización Financiera</span></div></div><div class="title">`)
        .replace('.page{width:8.5in;min-height:11in;margin:20px auto;background:#fff;padding:.45in;box-shadow:0 12px 40px rgba(0,0,0,.18)}','.page{width:8.5in;min-height:11in;margin:20px auto;background:#fff;padding:.5in;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.16)}')
        .replace('.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #D4AF37;padding-bottom:16px}','.head{display:flex;justify-content:space-between;align-items:center;gap:24px;border-bottom:3px solid #D4AF37;padding-bottom:18px}.brandBlock{display:flex;align-items:center;gap:14px;min-width:0}.brandCopy{display:flex;flex-direction:column;gap:3px}.brandCopy strong{font-size:18px;letter-spacing:.2px}.brandCopy span{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#7b6a2d}')
        .replace('.logo{width:220px;max-height:95px;object-fit:contain}','.logo{width:76px;height:76px;object-fit:contain;display:block;flex:0 0 auto}')
        .replace('.title h1{margin:0;font-size:25px}','.title h1{margin:0;font-size:25px;letter-spacing:.4px}')
        .replace('.summary{display:grid;grid-template-columns:1fr 310px;gap:20px;margin:22px 0}','.summary{display:grid;grid-template-columns:1fr 310px;gap:24px;margin:24px 0}')
        .replace('.box{border:1px solid #D7B75A;border-radius:8px;overflow:hidden}','.box{border:1px solid #D7B75A;border-radius:10px;overflow:hidden;background:#fffdf7}')
        .replace('.line{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}','.line{display:flex;justify-content:space-between;gap:16px;padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}')
        .replace('.thanks{background:#111;color:#D4AF37;padding:14px 20px;border-radius:4px;font-style:italic}','.thanks{color:#8a6a00;font-weight:700;font-style:italic;padding:8px 0}')
        .replace('@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}.actions{display:none}}','@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}.actions{display:none}.logo{print-color-adjust:exact;-webkit-print-color-adjust:exact}}');
    };
    branded.__vxBranded=true;
    root.reportHtml=branded;
  }

'''
    source = source.replace(anchor, branding + anchor, 1)
    vnext.write_text(source, encoding='utf-8')
    print('UPDATED: vNext report branding')
else:
    print('ALREADY: vNext report branding')

replace_once(
    'src/mobile-vnext-ui.js',
    "  function boot(){installCss();if(!ensureShell())return;rebuildNav();rebuildMenu();wrapRender();renderAll();root.addEventListener('mercatax:native-ready',renderAll);}",
    "  function boot(){installCss();installReportBranding();if(!ensureShell())return;rebuildNav();rebuildMenu();wrapRender();renderAll();root.addEventListener('mercatax:native-ready',renderAll);}",
    'install report branding at boot',
)

# Package the approved 1024px AppIcon at the same path in static and native bundles.
for filename in ['scripts/build-mobile.mjs', 'scripts/build-web.mjs']:
    path = Path(filename)
    source = path.read_text(encoding='utf-8')
    if 'const reportLogoSource =' not in source:
        anchor = "for (const dir of ['assets', 'src']) {\n  if (existsSync(dir)) cpSync(dir, `${out}/${dir}`, { recursive: true });\n}\n"
        if anchor not in source:
            raise SystemExit(f'FAIL CLOSED: copy anchor missing in {filename}')
        addition = f'''\n// Preserve the approved 1024px store AppIcon for branded report preview/print/export.\nconst reportLogoSource = '{REPORT_LOGO}';\nif (!existsSync(reportLogoSource)) throw new Error('Approved MercaTax report logo asset is missing');\nconst reportLogoDir = `${{out}}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;\nmkdirSync(reportLogoDir, {{ recursive: true }});\ncpSync(reportLogoSource, `${{reportLogoDir}}/AppIcon-512@2x.png`);\n'''
        path.write_text(source.replace(anchor, anchor + addition, 1), encoding='utf-8')
        print(f'UPDATED: package report logo in {filename}')
    else:
        print(f'ALREADY: package report logo in {filename}')

# Align runtime integration expectations with the actual vNext loader.
replace_once(
    'test/runtime-tax-integration.test.js',
    """  assert.deepEqual(paths, [\n    '/src/domain.js',\n    '/src/tax-remediation.js',\n    '/src/tax-calendar-contract.js',\n    '/src/tax-ui-bridge.js',\n    '/src/app.js',\n    '/src/mobile-r1-ui.js',\n  ]);""",
    """  assert.deepEqual(paths, [\n    '/src/domain.js',\n    '/src/tax-remediation.js',\n    '/src/tax-calendar-contract.js',\n    '/src/tax-ui-bridge.js',\n    '/src/app.js',\n    '/src/mobile-r1-ui.js',\n    '/src/mobile-vnext-ui.js',\n  ]);""",
    'runtime loader path contract',
)
replace_once(
    'test/runtime-tax-integration.test.js',
    "  assert.equal(paths.at(-1), '/src/mobile-r1-ui.js');",
    "  assert.equal(paths.at(-1), '/src/mobile-vnext-ui.js');",
    'runtime final loader assertion',
)

runtime = Path('test/runtime-tax-integration.test.js')
source = runtime.read_text(encoding='utf-8')
if "scriptPath === '/src/mobile-vnext-ui.js'" not in source:
    guard = """    if (scriptPath === '/src/mobile-r1-ui.js') {\n      assert.doesNotMatch(source, /window\\.sendLocalReminder|faltan ['\" ]*\\+ *days|IVU estatal 10\\.5%|IVU municipal 1%|radicar antes del día 20/i);\n    }"""
    extended = guard + """\n    if (scriptPath === '/src/mobile-vnext-ui.js') {\n      assert.doesNotMatch(source, /sendLocalReminder\\s*=|20-today\\.getDate|days=20-d|radicar antes del día 20/i);\n      assert.match(source, /MercaTaxDomain\\.calculateTaxAdded/);\n      assert.match(source, /MercaTaxDomain\\.calculateTaxIncluded/);\n    }"""
    if guard not in source:
        raise SystemExit('FAIL CLOSED: mobile runtime safety guard anchor not found')
    runtime.write_text(source.replace(guard, extended, 1), encoding='utf-8')
    print('UPDATED: vNext runtime safety assertions')
else:
    print('ALREADY: vNext runtime safety assertions')

# Focused regression coverage for branding.
unit = Path('test/mobile-vnext-ui.test.js')
source = unit.read_text(encoding='utf-8')
if "const reportLogo = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';" not in source:
    source = source.replace("import { readFileSync } from 'node:fs';", "import { existsSync, readFileSync } from 'node:fs';", 1)
    anchor = "const build = readFileSync('scripts/build.mjs', 'utf8');\n"
    addition = "const buildMobile = readFileSync('scripts/build-mobile.mjs', 'utf8');\nconst buildWeb = readFileSync('scripts/build-web.mjs', 'utf8');\nconst reportLogo = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';\n"
    if anchor not in source:
        raise SystemExit('FAIL CLOSED: vNext unit-test import anchor not found')
    source = source.replace(anchor, anchor + addition, 1)
    source += """\n\ntest('report branding uses the approved 1024px AppIcon and packages it for web/mobile', () => {\n  assert.equal(existsSync(reportLogo), true);\n  assert.match(ui, /REPORT_LOGO_PATH='ios\\/App\\/App\\/Assets\\.xcassets\\/AppIcon\\.appiconset\\/AppIcon-512@2x\\.png'/);\n  assert.match(ui, /MercaTax IVU PR<\\/strong><span>Organización Financiera/);\n  assert.doesNotMatch(ui, /REPORT_LOGO_PATH=['\"]assets\\/logo\\.png/);\n  assert.ok(buildMobile.includes(reportLogo));\n  assert.ok(buildWeb.includes(reportLogo));\n});\n"""
    unit.write_text(source, encoding='utf-8')
    print('UPDATED: report branding regression test')
else:
    print('ALREADY: report branding regression test')

# Make packaging evidence explicit in the existing gate.
gate = Path('.github/workflows/nova-ui-refinement-gate.yml')
source = gate.read_text(encoding='utf-8')
if 'Verify official report logo packaged' not in source:
    anchor = "      - name: Build mobile web bundle\n        run: npm run mobile:build\n\n      - name: Mobile TAX parity\n"
    replacement = "      - name: Build mobile web bundle\n        run: npm run mobile:build\n\n      - name: Verify official report logo packaged\n        run: test -f \"www/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png\"\n\n      - name: Mobile TAX parity\n"
    if anchor not in source:
        raise SystemExit('FAIL CLOSED: NOVA gate mobile-build anchor not found')
    gate.write_text(source.replace(anchor, replacement, 1), encoding='utf-8')
    print('UPDATED: NOVA packaging evidence gate')
else:
    print('ALREADY: NOVA packaging evidence gate')

forbidden = {
    'src/domain.js',
    'src/tax-remediation.js',
    'src/tax-calendar-contract.js',
    'src/tax-ui-bridge.js',
}
changed = set(subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines())
touched = sorted(changed & forbidden)
if touched:
    raise SystemExit('FAIL CLOSED: forbidden TAX files changed: ' + ', '.join(touched))
print('Changed files:')
for item in sorted(changed):
    print('-', item)
