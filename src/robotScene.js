// Clone transforms only; geometry and materials remain shared with the GLTF cache.
export function cloneRobotScene(source) {
  const scene = source.clone(true);
  const nodes = {};
  const rest = [];
  scene.traverse((node) => {
    if (node.name) nodes[node.name] = node;
    rest.push({
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    });
  });
  const resetPose = () => {
    for (const { node, position, quaternion } of rest) {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
    }
  };
  return { scene, nodes, resetPose };
}
