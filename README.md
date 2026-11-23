# SAT Reading and Writing Practice Test 3 (Simulacro 3, Aug-Oct 2026)

Independent static test for GitHub Pages.

## Google Sheets connection

1. Open the Google Sheet.
2. Go to Extensions > Apps Script.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy the `/exec` URL.
8. Paste that URL into `app.js` in `CONFIG.scriptUrl`.

The script creates one row per submission with the scores, an SAT estimate, each student answer (`M1_Q1`…`M2_Q27`) and the correct answer next to it (`M1_Q1_CORRECT`…). Run `setupSheet` once from the editor to create and format the headers.

After editing `Code.gs`, publish a **new version** of the existing deployment (Deploy > Manage deployments > Edit > Version: New version) so the `/exec` URL stays the same.

Use a separate Google Sheet (or at least a separate tab) for each simulacro so results from different tests do not mix.
