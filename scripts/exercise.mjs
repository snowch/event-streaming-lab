export function renderExercise(item){
 return `<section class="practice"><h2>Think it through</h2><p class="exercise-question">${item.question}</p><div class="exercise-support"><details class="exercise-hints"><summary>Show hints</summary><ol class="hint-list">${item.hints.map((hint,i)=>`<li><details><summary>Hint ${i+1}</summary><p>${hint}</p></details></li>`).join('')}</ol></details><details class="exercise-answer"><summary>Show explanation</summary><div class="exercise-explanation"><p>${item.answer}</p></div></details></div></section>`;
}
