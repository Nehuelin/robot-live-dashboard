// The same content rules apply to every visibility mask; no combination table.
const needs = {
  orientation: { width: 340, height: 350 },
  battery: { width: 280, height: 320 },
  forces: { width: 260, height: 290 },
  motors: { width: 460, height: 410 },
  model: { width: 460, height: 410 },
};
export function planDashboard(ids, width, availableHeight) {
  const gap = width <= 650 ? 10 : 12;
  const rows = [];
  for (const id of ids) {
    let row = rows.at(-1);
    if (
      !row ||
      width <= 650 ||
      row.length === 3 ||
      row.reduce((sum, key) => sum + needs[key].width + gap, 0) +
        needs[id].width >
        width
    ) {
      row = [];
      rows.push(row);
    }
    row.push(id);
  }
  const minima = rows.map((row) =>
    Math.max(...row.map((id) => needs[id].height)),
  );
  const spare = Math.max(
    0,
    Math.min(availableHeight, 960) -
      minima.reduce((a, b) => a + b, 0) -
      gap * Math.max(0, rows.length - 1),
  );
  const total = minima.reduce((a, b) => a + b, 0);
  const panels = {};
  rows.forEach((row, index) => {
    const rowHeight = Math.round(
      minima[index] + (spare * minima[index]) / total,
    );
    const sumWidth = row.reduce((sum, id) => sum + needs[id].width, 0);
    let remaining = 12;
    row.forEach((id, i) => {
      const span =
        i === row.length - 1
          ? remaining
          : Math.max(
              1,
              Math.min(
                remaining - (row.length - i - 1),
                Math.round((12 * needs[id].width) / sumWidth),
              ),
            );
      remaining -= span;
      panels[id] = {
        gridColumn: `span ${span}`,
        gridRow: index + 1,
        "--panel-height": `${rowHeight}px`,
      };
    });
  });
  return { panels, rows: rows.length };
}
