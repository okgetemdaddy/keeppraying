

## Fix: Past Reports Not Displaying Content

**Root cause**: The query fetching past reports (line 91) selects only `id, model_used, created_at, chat_log` but omits `report_content`. When you click a past report, it finds the record but `report_content` is `undefined`, so the display shows nothing.

**Fix**: Add `report_content` to the select statement on line 91:

```
.select("id, model_used, created_at, chat_log, report_content")
```

One line change in `src/pages/Fruit.tsx`.

