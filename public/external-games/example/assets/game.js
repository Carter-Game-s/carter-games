let target = 0,
  score = 0,
  left = 0,
  timer;
const status = document.querySelector("#status"),
  board = document.querySelector("#board");
for (let i = 0; i < 9; i++) {
  const b = document.createElement("button");
  b.textContent = i + 1;
  b.setAttribute("aria-label", "Target " + (i + 1));
  b.onclick = () => hit(i);
  board.append(b);
}
function paint() {
  [...board.children].forEach((b, i) =>
    b.classList.toggle("target", left > 0 && i === target),
  );
  status.textContent =
    left > 0
      ? `Score ${score} · ${left} seconds`
      : `Round over · Score ${score}`;
}
function hit(i) {
  if (left > 0 && i === target) {
    score++;
    let next;
    do {
      next = Math.floor(Math.random() * 9);
    } while (next === target);
    target = next;
    paint();
  }
}
document.querySelector("#start").onclick = () => {
  clearInterval(timer);
  score = 0;
  left = 20;
  target = Math.floor(Math.random() * 9);
  paint();
  timer = setInterval(() => {
    left--;
    paint();
    if (left === 0) clearInterval(timer);
  }, 1000);
};
addEventListener("keydown", (e) => {
  if (/^[1-9]$/.test(e.key)) hit(Number(e.key) - 1);
});
addEventListener("pagehide", () => clearInterval(timer));
