const TITLE = "Spark Quiz";
const QUESTIONS = [
  { q: "Which planet is famous for its bright rings?", choices: ["Mars", "Saturn", "Venus", "Mercury"], answer: 1 },
  { q: "What do bees collect from flowers to make honey?", choices: ["Nectar", "Sand", "Bark", "Frost"], answer: 0 },
  { q: "Which ocean is the largest?", choices: ["Indian", "Arctic", "Pacific", "Southern"], answer: 2 },
  { q: "How many minutes are in one hour?", choices: ["30", "60", "90", "100"], answer: 1 },
];

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <div class="top">
      <div>
        <p class="eyebrow">Quiz</p>
        <h1 id="title"></h1>
      </div>
      <strong id="score">0</strong>
    </div>
    <div class="progress"><span id="bar"></span></div>
    <div class="card">
      <p id="question"></p>
      <div class="choices" id="choices"></div>
      <p class="note" id="note"></p>
      <button class="primary" id="next" type="button">Next</button>
    </div>
  </div>
`;
document.getElementById("title").textContent = TITLE;

let index = 0;
let score = 0;
let locked = false;
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const noteEl = document.getElementById("note");
const nextBtn = document.getElementById("next");

function render() {
  locked = false;
  noteEl.textContent = "";
  nextBtn.hidden = index >= QUESTIONS.length;
  document.getElementById("bar").style.width = (index / QUESTIONS.length) * 100 + "%";
  document.getElementById("score").textContent = score + "/" + QUESTIONS.length;
  if (index >= QUESTIONS.length) {
    questionEl.textContent = "You scored " + score + " out of " + QUESTIONS.length + ".";
    choicesEl.replaceChildren();
    const again = document.createElement("button");
    again.type = "button";
    again.className = "choice";
    again.textContent = "Try the quiz again";
    again.addEventListener("click", () => { index = 0; score = 0; render(); });
    choicesEl.appendChild(again);
    return;
  }
  const item = QUESTIONS[index];
  questionEl.textContent = item.q;
  choicesEl.replaceChildren();
  item.choices.forEach((choice, choiceIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = choice;
    button.addEventListener("click", () => choose(choiceIndex, button));
    choicesEl.appendChild(button);
  });
}

function choose(choiceIndex, button) {
  if (locked || index >= QUESTIONS.length) return;
  locked = true;
  const item = QUESTIONS[index];
  const buttons = choicesEl.querySelectorAll(".choice");
  buttons[item.answer].classList.add("right");
  if (choiceIndex === item.answer) {
    score += 1;
    noteEl.textContent = "That's the one.";
  } else {
    button.classList.add("wrong");
    noteEl.textContent = "The highlighted answer is the one to remember.";
  }
  document.getElementById("score").textContent = score + "/" + QUESTIONS.length;
}

nextBtn.addEventListener("click", () => {
  if (!locked && index < QUESTIONS.length) {
    noteEl.textContent = "Pick an answer first.";
    return;
  }
  index += 1;
  render();
});
render();
