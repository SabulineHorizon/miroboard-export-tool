const $ = id => document.getElementById(id);
let busy = false;
function status(message, kind = '') {
  $('status').textContent = message;
  document.querySelector('.status').className = `status ${kind}`;
}
$('format').addEventListener('change', () => { $('tldraw-options').hidden = !['tldraw', 'all'].includes($('format').value); });
$('browse').addEventListener('click', async () => {
  try { const folder = await window.miroDesktop.chooseFolder(); if (folder) { $('output').value = folder; $('open-folder').disabled = false; } }
  catch { status('Could not choose a folder. Please retry.', 'error'); }
});
$('open-folder').addEventListener('click', async () => {
  try { const result = await window.miroDesktop.openFolder(); if (!result.ok) status(result.error, 'error'); }
  catch { status('Could not open the output folder.', 'error'); }
});
window.miroDesktop.onProgress(message => { if (busy) status(message); });
$('export-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  if (!$('output').value) { status('Choose an output folder using Browse.', 'error'); return; }
  busy = true;
  $('settings').disabled = true;
  $('export').disabled = true;
  $('export').textContent = 'Exporting…';
  $('progress').hidden = false;
  status('Connecting to Miro…');
  const settings = { board: $('board').value, token: $('token').value, outputDir: $('output').value,
    formats: $('format').value === 'all' ? ['canvas', 'markdown', 'tldraw', 'drawio'] : [$('format').value],
    tldrawFormat: $('tldraw-format').value, downloadImages: $('images').checked };
  $('token').value = '';
  try {
    const result = await window.miroDesktop.exportBoard(settings);
    if (result.ok) status(`Export complete. ${result.files} files written; ${result.nodes} board items converted.${result.warnings.length ? '\nSome content was omitted: ' + result.warnings.join('; ') + '.' : ''}`, 'success');
    else status(result.error, 'error');
  } catch { status('The export could not complete. Please retry. Partial files may remain.', 'error'); }
  finally {
    settings.token = '';
    busy = false;
    $('settings').disabled = false;
    $('export').disabled = false;
    $('export').textContent = 'Export board';
    $('progress').hidden = true;
  }
});
