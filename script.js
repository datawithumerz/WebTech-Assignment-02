'use strict';
const questionBank = [
 ['HTML','Which element represents the main navigation links?', ['<section>','<nav>','<aside>','<footer>'],1,'The nav element identifies a section containing navigation links.'],
 ['HTML','Which attribute provides a text alternative for an image?', ['title','src','alt','href'],2,'The alt attribute describes an image for assistive technology and when it cannot load.'],
 ['HTML','Which input type provides basic email format validation?', ['text','email','address','mail'],1,'An input with type email checks basic email syntax when a form is submitted.'],
 ['CSS','Which property controls space inside an element’s border?', ['margin','padding','gap','outline'],1,'Padding creates space between content and its border. Margin creates space outside it.'],
 ['CSS','Which declaration makes an element a Flexbox container?', ['position: flex','display: block','display: flex','flex: container'],2,'display: flex enables Flexbox layout for the direct children.'],
 ['CSS','Which selector has the highest specificity?', ['p','.card','#header','article p'],2,'An ID selector has greater specificity than class or element selectors.'],
 ['CSS','Which media query applies at viewport widths of 600px or less?', ['@media (min-width: 600px)','@media (max-width: 600px)','@screen 600px','@media (width > 600px)'],1,'max-width includes viewports at or below the specified width.'],
 ['JavaScript','Which array method creates a new array containing matching items?', ['map()','find()','filter()','push()'],2,'filter() returns all elements that pass a test in a new array.'],
 ['JavaScript','Which comparison checks value and type?', ['=','==','===','!='],2,'Strict equality (===) compares values without converting their types.'],
 ['JavaScript','Which method listens for a button click?', ['addEventListener()','querySelectorAll()','setAttribute()','JSON.parse()'],0,'addEventListener registers a function to run when an event occurs.'],
 ['JavaScript','What does localStorage preserve?', ['Only server files','Data until the next function call','String data across browser sessions','Only JavaScript arrays'],2,'localStorage stores strings for an origin across sessions, unless storage is cleared or unavailable.'],
 ['JavaScript','Which function stops a repeating interval?', ['stopTimeout()','clearInterval()','removeTimer()','endInterval()'],1,'clearInterval stops the repeating timer associated with its interval ID.'],
 ['Bootstrap','How many columns are in the default Bootstrap grid?', ['10','16','12','8'],2,'Bootstrap uses a responsive grid with 12 columns by default.'],
 ['Bootstrap','What does col-md-6 mean in Bootstrap?', ['Six columns at every screen size','Half width from the medium breakpoint upward','Six pixels wide','Six rows tall'],1,'col-md-6 spans 6 of 12 columns from the medium breakpoint upward.'],
 ['Bootstrap','Which class creates a flex container?', ['flex-container','display-flex','d-flex','row-flex'],2,'The d-flex utility applies display: flex.']
].map((q, id) => ({
	id,
	category: q[0],
	question: q[1],
	options: q[2],
	correctIndex: q[3],
	explanation: q[4]
}));
const $ = id => document.getElementById(id);
const QUESTION_COUNT = 5;
const SECONDS = 20;
let questions = [];
let answers = [];
let current = 0;
let timerId = null;
let advanceId = null;
let deadline = 0;
let startedAt;
let finishedAt;

function readStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {}
}

function setTheme(theme) {
	document.documentElement.dataset.theme = theme;
	$('theme').textContent = theme === 'dark' ? '☀ Light mode' : '☾ Dark mode';
	$('theme').setAttribute(
		'aria-label',
		`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
	);
}

setTheme(readStorage('quizcraft-theme') === 'dark' ? 'dark' : 'light');

$('theme').onclick = () => {
	const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
	setTheme(theme);
	writeStorage('quizcraft-theme', theme);
};

function updateBest() {
	const best = readStorage('quizcraft-best');
	$('best').textContent = best === null ? '—' : best;
}

updateBest();

function shuffleQuestions(items) {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function startQuiz() {
	clearInterval(timerId);
	clearTimeout(advanceId);
	questions = shuffleQuestions(questionBank).slice(0, QUESTION_COUNT);
	answers = [];
	current = 0;
	startedAt = new Date();
	$('welcome').hidden = true;
	$('results').hidden = true;
	$('quiz').hidden = false;
	showQuestion();
}

function updateProgress() {
	$('progress').replaceChildren(
		...questions.map((q, i) => {
			const s = document.createElement('span');
			s.className = `segment ${answers[i]?.status || (i === current ? 'current' : '')}`;
			s.setAttribute('role', 'img');
			s.setAttribute(
				'aria-label',
				`Question ${i + 1}: ${answers[i]?.status || (i === current ? 'current' : 'upcoming')}`
			);
			s.title = s.getAttribute('aria-label');
			return s;
		})
	);
}

function showQuestion() {
	clearTimeout(advanceId);
	const q = questions[current];
	$('counter').textContent = `QUESTION ${current + 1} OF ${QUESTION_COUNT}`;
	$('category').textContent = q.category;
	$('question').textContent = q.question;
	$('feedback').hidden = true;
	$('next').disabled = true;
	$('next').textContent = current === QUESTION_COUNT - 1 ? 'View results →' : 'Next question →';
	$('skip').disabled = false;
	$('options').replaceChildren(
		...q.options.map((option, index) => {
			const b = document.createElement('button');
			b.className = 'answer';
			const label = document.createElement('span');
			label.className = 'letter';
			label.textContent = String.fromCharCode(65 + index);
			const text = document.createElement('span');
			text.textContent = option;
			b.append(label, text);
			b.onclick = () => submitAnswer(index);
			return b;
		})
	);
	updateProgress();
	$('question').focus();
	startTimer();
}

function startTimer() {
	clearInterval(timerId);
	deadline = Date.now() + SECONDS * 1000;
	tick();
	timerId = setInterval(tick, 100);
}

function tick() {
	const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
	$('timer').textContent = `${remaining}s`;
	$('timer').classList.toggle('urgent', remaining <= 5);
	if (remaining === 0) submitAnswer(null, 'timeout');
}

function submitAnswer(selected, status) {
	if (answers[current]) return;
	if (Date.now() >= deadline) {
		selected = null;
		status = 'timeout';
	}
	clearInterval(timerId);
	const q = questions[current];
	status = status || (selected === q.correctIndex ? 'correct' : 'wrong');
	answers[current] = { selected, status };
	[...$('options').children].forEach((b, i) => {
		b.disabled = true;
		if (i === q.correctIndex) {
			b.classList.add('correct');
			b.lastChild.textContent += ' ✓';
		} else if (i === selected) {
			b.classList.add('wrong');
			b.lastChild.textContent += ' ✕';
		}
	});
	const heading = {
		correct: 'Correct!',
		wrong: 'Not quite.',
		skipped: 'Question skipped.',
		timeout: "Time’s up!"
	}[status];
	$('feedback').textContent = `${heading} ${q.explanation}`;
	$('feedback').hidden = false;
	$('next').disabled = false;
	$('skip').disabled = true;
	updateProgress();
	if (status === 'timeout') advanceId = setTimeout(nextQuestion, 3000);
}

function nextQuestion() {
	if (!answers[current]) return;
	clearTimeout(advanceId);
	current++;
	if (current < QUESTION_COUNT) showQuestion();
	else showResults();
}

function getTotals() {
	return {
		correct: answers.filter(a => a.status === 'correct').length,
		wrong: answers.filter(a => a.status === 'wrong').length,
		unanswered: answers.filter(a => a.selected === null).length
	};
}

function showResults() {
	clearInterval(timerId);
	finishedAt = new Date();
	$('quiz').hidden = true;
	$('results').hidden = false;
	const t = getTotals();
	const percent = t.correct / QUESTION_COUNT * 100;
	$('percentage').textContent = `${percent}%`;
	$('resultTitle').textContent = percent >= 80
		? 'Nicely done!'
		: percent >= 40
			? 'Keep building.'
			: 'Every attempt is progress.';
	$('scoreText').textContent = `You answered ${t.correct} of ${QUESTION_COUNT} questions correctly.`;
	writeStorage(
		'quizcraft-best',
		String(Math.max(Number(readStorage('quizcraft-best')) || 0, t.correct))
	);
	updateBest();
	$('totals').replaceChildren(
		...Object.entries(t).map(([key, value]) => {
			const col = document.createElement('div');
			col.className = 'col-4';
			const box = document.createElement('div');
			box.className = 'stat';
			const strong = document.createElement('strong');
			strong.textContent = value;
			const span = document.createElement('span');
			span.textContent = key[0].toUpperCase() + key.slice(1);
			box.append(strong, span);
			col.append(box);
			return col;
		})
	);
	$('review').replaceChildren(
		...questions.map((q, i) => {
			const item = document.createElement('article');
			item.className = 'review-item';
			const state = document.createElement('span');
			state.className = 'badge-status';
			state.textContent = answers[i].status.toUpperCase();
			const title = document.createElement('h4');
			title.textContent = `${i + 1}. ${q.question}`;
			const chosen = document.createElement('p');
			chosen.textContent = `Your answer: ${answers[i].selected === null ? 'Unanswered' : q.options[answers[i].selected]}`;
			const correct = document.createElement('p');
			correct.textContent = `Correct answer: ${q.options[q.correctIndex]}`;
			const explanation = document.createElement('p');
			explanation.textContent = q.explanation;
			item.append(state, title, chosen, correct, explanation);
			return item;
		})
	);
	$('pdfStatus').textContent = '';
	$('resultTitle').tabIndex = -1;
	$('resultTitle').focus();
}

function downloadPDF() {
	if (!window.jspdf) {
		$('pdfStatus').textContent = 'PDF library could not load. Ensure the vendor folder is beside index.html.';
		return;
	}
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();
	let y = 22;

	function line(text, size = 11) {
		doc.setFontSize(size);
		const lines = doc.splitTextToSize(text, 170);
		for (const l of lines) {
			if (y > 277) {
				doc.addPage();
				y = 22;
			}
			doc.text(l, 20, y);
			y += 6;
		}
		y += 3;
	}

	const t = getTotals();
	line('QuizCraft | Web Technologies', 20);
	line(`Completed: ${finishedAt.toLocaleString()}`);
	line(`Score: ${t.correct}/${QUESTION_COUNT} (${t.correct / QUESTION_COUNT * 100}%)`, 15);
	line(`Correct: ${t.correct} | Incorrect: ${t.wrong} | Unanswered: ${t.unanswered}`);
	line(`Elapsed time: ${Math.round((finishedAt - startedAt) / 1000)} seconds`);
	questions.forEach((q, i) => {
		line(`${i + 1}. ${q.question}`, 12);
		line(`Status: ${answers[i].status}`);
		line(`Your answer: ${answers[i].selected === null ? 'Unanswered' : q.options[answers[i].selected]}`);
		line(`Correct answer: ${q.options[q.correctIndex]}`);
		line(`Explanation: ${q.explanation}`);
	});
	doc.save('QuizCraft-results.pdf');
	$('pdfStatus').textContent = 'Your PDF download has started.';
}

$('start').onclick = startQuiz;
$('restart').onclick = startQuiz;
$('next').onclick = nextQuestion;
$('skip').onclick = () => submitAnswer(null, 'skipped');
$('download').onclick = downloadPDF;
