export function telemetry(model = "go2", ts = 1) {
  const names =
    model === "g1"
      ? [
          "L_hip_pitch",
          "L_hip_roll",
          "L_hip_yaw",
          "L_knee",
          "R_hip_pitch",
          "R_hip_roll",
          "R_hip_yaw",
          "R_knee",
          "torso_pitch",
          "torso_roll",
          "torso_yaw",
          "L_shoulder_pitch",
          "L_shoulder_roll",
          "L_shoulder_yaw",
          "L_elbow",
          "R_shoulder_pitch",
          "R_shoulder_roll",
          "R_shoulder_yaw",
          "R_elbow",
        ]
      : [
          "FR_hip",
          "FR_thigh",
          "FR_calf",
          "FL_hip",
          "FL_thigh",
          "FL_calf",
          "RR_hip",
          "RR_thigh",
          "RR_calf",
          "RL_hip",
          "RL_thigh",
          "RL_calf",
        ];
  return {
    modelo: model,
    ts,
    motores: Array.from({ length: model === "g1" ? 29 : 12 }, (_, id) => ({
      id,
      nombre: names[id] || `motor_${id}`,
      angulo: 10,
      velocidad: -0.5,
      torque: 2,
      temperatura: [35, 40, 60, 65][id % 4],
    })),
    imu: { roll: 1, pitch: 2, yaw: 3, ax: 0, ay: 0, az: 9.81 },
    bms: {
      soc: 86,
      corriente: -1200,
      temperatura: 32,
      celdas: [3.7, 3.72, 3.71, 3.69],
    },
    fuerzas:
      model === "g1"
        ? { R_foot: 1, L_foot: 0 }
        : { FR: 1, FL: 0, RR: 1, RL: 0 },
  };
}

export class MockSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    MockSocket.instances.push(this);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  message(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

export const response = (data, ok = true) => ({
  ok,
  status: ok ? 200 : 404,
  json: async () => data,
});
export const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
