import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { Metric } from "./Shared";
import { fmt, finiteNumber } from "../utils";

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#10151b",
      titleColor: "#e7edf2",
      bodyColor: "#7d8b97",
      displayColors: true,
    },
  },
  scales: {
    x: { display: false },
    y: {
      suggestedMin: -5,
      suggestedMax: 5,
      border: { display: false },
      ticks: {
        color: "#7d8b97",
        font: { size: 9, family: "Share Tech Mono" },
        maxTicksLimit: 5,
      },
      grid: { color: "#26313b" },
    },
  },
};
export function OrientationPanel({
  imu = {},
  timestamp = null,
  valid = false,
  sequence,
  active = true,
}) {
  const pitch = Math.max(-35, Math.min(35, finiteNumber(imu.pitch) ?? 0));
  const roll = Math.max(-35, Math.min(35, finiteNumber(imu.roll) ?? 0));
  const buffer = useRef({ labels: [], roll: [], pitch: [], yaw: [] });
  const lastSequence = useRef(null);
  const previousActive = useRef(active);
  const [chartData, setChartData] = useState(null);
  useEffect(() => {
    if (!valid) return;
    const data = buffer.current;
    if (sequence === undefined || sequence !== lastSequence.current) {
      lastSequence.current = sequence;
      data.labels.push(fmt(timestamp, 2));
      ["roll", "pitch", "yaw"].forEach((key) =>
        data[key].push(finiteNumber(imu[key])),
      );
      if (data.labels.length > 60)
        Object.values(data).forEach((values) => values.shift());
    } else if (active === previousActive.current) return;
    previousActive.current = active;
    if (!active) return;
    setChartData({
      labels: [...data.labels],
      datasets: ["roll", "pitch", "yaw"].map((key, i) => ({
        label: key[0].toUpperCase() + key.slice(1),
        data: [...data[key]],
        borderColor: ["#42e8e0", "#ffba52", "#68e0a0"][i],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        spanGaps: false,
      })),
    });
  }, [imu, timestamp, valid, sequence, active]);
  return (
    <div className="orientation-wrap">
      <div className="orientation-top">
        <div
          className="attitude"
          role="img"
          aria-label={`Roll ${fmt(imu.roll)} grados, pitch ${fmt(imu.pitch)} grados`}
        >
          <div
            className="attitude-world"
            style={{
              transform: `translateY(${pitch * 2.5}px) rotate(${-roll * 1.5}deg)`,
            }}
          >
            <div className="sky" />
            <div className="ground" />
            <div className="horizon-line" />
          </div>
          <div className="attitude-ticks" />
          <div className="reticle">⌁</div>
          <span className="attitude-label">ATTITUDE</span>
        </div>
        <div className="orientation-metrics">
          <Metric label="ROLL" value={fmt(imu.roll)} unit="°" />
          <Metric label="PITCH" value={fmt(imu.pitch)} unit="°" />
          <Metric label="YAW" value={fmt(imu.yaw)} unit="°" />
        </div>
      </div>
      <div className="chart-heading">
        <span>HISTORIAL ANGULAR</span>
        <div className="chart-legend">
          <span>Roll</span>
          <span>Pitch</span>
          <span>Yaw</span>
        </div>
      </div>
      <div className="imu-chart">
        {chartData ? (
          <Line
            data={chartData}
            options={chartOptions}
            aria-label="Historial de roll, pitch y yaw en grados; últimas 60 muestras"
          />
        ) : (
          <div className="chart-empty">
            El historial comienza con la primera muestra válida.
          </div>
        )}
      </div>
      <div className="accel-row">
        <span>ACCEL</span>
        <b>X {fmt(imu.ax, 2)}</b>
        <b>Y {fmt(imu.ay, 2)}</b>
        <b>
          Z {fmt(imu.az, 2)} <small>m/s²</small>
        </b>
      </div>
    </div>
  );
}
