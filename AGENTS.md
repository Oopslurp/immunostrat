## Sprite integration

For any Immunostrat spritesheet preparation or integration task, use the
`immunostrat-sprite-integration` skill.

Never stretch sprites, preserve the procedural fallback, and report any
gameplay visual state not represented by the provided spritesheet.

## Git workflow

After completing and validating a coherent implementation, balance change,
bugfix, or sprite batch, automatically stage the related files, create a
descriptive commit, and push the current branch. Do not wait for a separate
commit or push request.

When the user splits one coherent feature into several mini-tasks, keep using
the same feature branch and pull request when practical, and push each validated
commit to that branch. Start a new branch after the previous pull request has
been merged. Never merge a pull request without explicit user approval.
