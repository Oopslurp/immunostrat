## Sprite integration

For any Immunostrat spritesheet preparation or integration task, use the
`immunostrat-sprite-integration` skill.

Never stretch sprites, preserve the procedural fallback, and report any
gameplay visual state not represented by the provided spritesheet.

## Git workflow

After completing and validating a coherent implementation, balance change,
bugfix, documentation update, or sprite batch, automatically stage the related
files, create a descriptive commit, push the current branch, create or update
its pull request, and squash-merge that pull request. Do not wait for separate
commit, push, pull-request, or merge requests.

When the user splits one coherent feature into several mini-tasks, keep using
the same feature branch and pull request when practical, and push each validated
commit to that branch. Squash-merge the pull request once the coherent feature
is complete, then start a new branch for subsequent work.
