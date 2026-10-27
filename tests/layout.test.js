import { expect, it } from "vitest";
import { planDashboard } from "../src/dashboardLayout";
const ids = ["orientation", "battery", "forces", "motors", "model"];
const sizes = [320, 390, 768, 1024, 1366, 1920];
for (const width of sizes) {
  it.each(Array.from({ length: 32 }, (_, mask) => mask))(
    `layout ${width}px mask %i fills every row and respects content`,
    (mask) => {
      const visible = ids.filter((_, i) => mask & (1 << i));
      const plan = planDashboard(
        visible,
        width - (width <= 650 ? 20 : 36),
        650,
      );
      expect(Object.keys(plan.panels)).toEqual(visible);
      for (let row = 1; row <= plan.rows; row++) {
        const items = Object.values(plan.panels).filter(
          (p) => p.gridRow === row,
        );
        expect(
          items.reduce((sum, p) => sum + Number(p.gridColumn.split(" ")[1]), 0),
        ).toBe(12);
        expect(new Set(items.map((p) => p["--panel-height"])).size).toBe(1);
        expect(parseInt(items[0]["--panel-height"])).toBeGreaterThanOrEqual(
          290,
        );
      }
      if (visible.length === 1)
        expect(plan.panels[visible[0]]["--panel-height"]).toBe("650px");
      if (width <= 390) expect(plan.rows).toBe(visible.length);
    },
  );
}
