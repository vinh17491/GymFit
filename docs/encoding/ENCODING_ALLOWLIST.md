# Encoding scanner allowlist

The scanner still inspects allowlisted files and records every matching path,
line, column, signature, context, severity and category. Allowlisting only
prevents an intentional specification fixture from failing the active-source
gate.

| Path | Ranges | Reason |
| --- | --- | --- |
| `MASTER_TASK_COACH3_PROJECT_TEXT_ENCODING_RECOVERY.txt` | 17–28, 69–76, 82–84, 90–92, 200–219, 465, 483–485, 1117, 1257–1267 | User-owned master task deliberately includes mojibake examples and detector signatures. It is not application source or runtime data. |

No application source, database seed, migration, generated bundle or runtime
data is allowlisted.
