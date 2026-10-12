# Publishing games

Carter Games' VPS preloader watches the published `master` branch every 60
seconds. Publishing a self-contained HTML game creates its manifest entry,
logo, metadata, isolated player wrapper, and library entry automatically:

```bash
bun run games:publish ./my-game.html --title "My Game" --category arcade
```

The slug defaults to `pack-my-game`; use `--slug pack-your-name` to choose one.
Categories are arcade, puzzle, board, sports, action, and other. Optional
`--description` and `--version` customize the listing. To update a game published
this way, use the same slug with `--replace --version 1.0.1`. Original imported
game entries cannot be overwritten with this command.

Run the project checks, then commit and push the generated changes to `master`
and deploy the app normally. Include `game-assets/`, the corresponding
`public/external-games/` directory, `src/lib/offline-games/manifest.json`, and
`src/games/generated-external-registry.ts`. Publication is the push to the watched
branch; preparing files locally alone does not publish them.

No preloader manifest edit or service restart is needed. The loader discovers
the catalog, downloads only new or changed game content, checks its pinned Git
blob hash, and begins serving it after verification. Games are kept outside
`public/` and run only through the existing isolated player. If caching is still
in progress, the app can use its own verified local copy. Both the app and loader
reject corrupted content.

The loader keeps earlier verified versions so older deployments continue working
during an update. Its status dashboard shows automatic publishing state, last
successful check, new and updated games, and pending downloads. Failed checks
retry automatically with backoff; existing cached games remain available.

Publish only single HTML files with their needed assets embedded; the command
does not bundle external resources. Respect each game's authorship and license.
Native TypeScript games continue to use the normal app build and registry flow;
they do not need a separate downloadable HTML cache.
