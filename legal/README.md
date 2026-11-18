# License provenance

The project uses MIT, as declared in the original project's `package.json` at
commit `c6318ae9177e29f1900d474f2adb7fad6e93f0a9`:
https://github.com/essoen/miroboard-export-tool/blob/c6318ae9177e29f1900d474f2adb7fad6e93f0a9/package.json

Upstream did not include a standalone license or copyright notice. This fork's
root `LICENSE` supplies the standard MIT text. Its upstream attribution is
based on the original repository's 2026 Git history, which identifies
Stein-Otto Svorstøl (essoen); it is not a notice copied from an upstream license
file. The separate fork attribution applies only to fork contributions. No
claim is made to ownership of upstream code or third-party dependencies.

Two installed production packages omit license files. Their fallback texts are
preserved here, with their sources:

- `miro-api-2.2.4-LICENSE.txt`: MIT license at the npm release's `gitHead`,
  https://github.com/miroapp/api-clients/blob/e9745e3cf5c136ea0b145c73f4decfc918e77cba/LICENSE
- `tr46-LICENSE.txt`: the project's first explicit MIT license file,
  https://github.com/jsdom/tr46/blob/3a6f29721e7063b9ffd421e461a54beae6170001/LICENSE.md
  Version 0.0.3 declares MIT but its published source revision
  `a8009f9ce80ff5dbe71dd71e203afe4e4c878d28` has no license file. This text was
  added later; its original copyright year is retained without alteration.
- `UNICODE-LICENSE.txt`: https://www.unicode.org/license.txt, retrieved
  November 18, 2026. Included for the Unicode mapping data used by tr46.

`npm run licenses` collects the actual license and notice texts from all
production packages in `package-lock.json` into `THIRD_PARTY_NOTICES.txt`.
Fallbacks are restricted to the specific versions above. Electron's own license
is also included. Electron supplies `LICENSES.chromium.html` separately in the
packaged distribution; retain that file and `LICENSE.electron.txt`.

The generated inventory covers production dependencies, including dependencies
that may be bundled into the desktop JavaScript. It does not assert that every
listed package is executed by the desktop app. Development tools are not part
of this inventory unless they are distributed (Electron is explicitly included).

When dependencies change, regenerate and review the notices, then verify the
packaged files. Keep `LICENSE` and `THIRD_PARTY_NOTICES.txt` with distributions.
