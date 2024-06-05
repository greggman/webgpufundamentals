

export function drawEye(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -height / 2, width, Math.PI * 0.2, Math.PI * 0.8, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0,  height / 2, width, Math.PI * 1.2, Math.PI * 1.8, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, width / 5, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.restore();
}

export function roundedRect(ctx, x, y, width, height, radius) {
  if (radius === undefined) {
    radius = 5;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function arrow(ctx, x1, y1, x2, y2, start, end, size) {
  size = size || 1;
  const rot = -Math.atan2(x1 - x2, y1 - y2);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (start) {
    arrowHead(ctx, x1, y1, rot, size);
  }
  if (end) {
    arrowHead(ctx, x2, y2, rot + Math.PI, size);
  }
}

export function arrowHead(ctx, x, y, rot, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-5, -2);
  ctx.lineTo(0,  10);
  ctx.lineTo(5, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawSun(ctx, x, y, radius) {
  // draw light
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius / 3, 0, Math.PI * 2, false);
  ctx.fill();

  for (let ii = 0; ii < 12; ++ii) {
    ctx.rotate(1 / 12 * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo( 5, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
export function outlineText(ctx, msg, x, y) {
  ctx.strokeText(msg, x, y);
  ctx.fillText(msg, x, y);
}
