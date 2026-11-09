const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. ИГРОВЫЕ ДАННЫЕ ---
const stations = [
    { id: 0, name: "Полис", x: 400, y: 300, neighbors: [1, 2], owner: null, army: 7, res: "универсал" },
    { id: 1, name: "Арбатская", x: 250, y: 200, neighbors: [0, 3], owner: 1, army: 2, res: "свиньи" },
    { id: 2, name: "Чеховская", x: 550, y: 200, neighbors: [0, 4], owner: 2, army: 2, res: "патроны" },
    { id: 3, name: "Киевская", x: 250, y: 400, neighbors: [1], owner: 1, army: 1, res: "грибы" },
    { id: 4, name: "Цветной бульвар", x: 550, y: 400, neighbors: [2], owner: 2, army: 1, res: "свиньи" },
];

const threatsList = [
    { name: "Стая крыс", power: 3, desc: "Голодные твари вылезли из вентиляции.", icon: "🐀" },
    { name: "Дикий мутант", power: 5, desc: "Огромный зверь преграждает путь.", icon: "👹" },
    { name: "Бандиты", power: 6, desc: "Мародеры не хотят отдавать станцию.", icon: "🔫" },
    { name: "Аномалия", power: 4, desc: "Радиационный фон выжигает легкие.", icon: "☢️" }
];

const questsList = [
    { text: "Захватить 1 станцию", type: "conquest", target: 1, progress: 0 },
    { text: "Собрать 5 патронов", type: "bullets", target: 5, progress: 0 },
    { text: "Победить 2 угрозы", type: "threats", target: 2, progress: 0 }
];

let currentThreat = null;
let attackTarget = null;
let heroTarget = null;

// Добавили heroPower: 3 в характеристики игроков
const players = [
    { id: 1, name: "Красная линия", color: "#e63946", points: 3, armyStrength: 2, res: {s: 1, g: 1, b: 1}, heroStation: 1, quest: null, heroPower: 3 },
    { id: 2, name: "Ганза", color: "#457b9d", points: 3, armyStrength: 2, res: {s: 1, g: 1, b: 1}, heroStation: 2, quest: null, heroPower: 3 }
];

let currentPlayerIdx = 0;
let currentPhase = 1;
let selectedStation = null;

function getCurrentPlayer() { return players[currentPlayerIdx]; }

// --- 2. ОТРИСОВКА КАРТЫ ---
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    stations.forEach(st => {
        st.neighbors.forEach(nId => {
            if (st.id < nId) {
                const neighbor = stations.find(s => s.id === nId);
                ctx.beginPath();
                ctx.moveTo(st.x, st.y);
                ctx.lineTo(neighbor.x, neighbor.y);
                ctx.stroke();
            }
        });
    });

    stations.forEach(st => {
        let color = '#666';
        if (st.owner) {
            const owner = players.find(p => p.id === st.owner);
            color = owner ? owner.color : '#666';
        }

        if (currentPhase === 3 && st.owner !== getCurrentPlayer().id) {
            const myStations = stations.filter(s => s.owner === getCurrentPlayer().id);
            const canAttack = myStations.some(mySt => mySt.neighbors.includes(st.id));
            if (canAttack) {
                ctx.beginPath();
                ctx.arc(st.x, st.y, 35, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fill();
            }
        }

        ctx.beginPath();
        ctx.arc(st.x, st.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.army, st.x, st.y);

        ctx.fillStyle = '#ddd';
        ctx.font = '14px Arial';
        ctx.fillText(st.name, st.x, st.y + 50);

        if (selectedStation === st) {
            ctx.beginPath();
            ctx.arc(st.x, st.y, 38, 0, Math.PI * 2);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });

    players.forEach(p => {
        if (p.heroStation !== undefined && p.heroStation !== null) {
            const st = stations.find(s => s.id === p.heroStation);
            if (st) {
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.moveTo(st.x, st.y - 40);
                ctx.lineTo(st.x - 10, st.y - 55);
                ctx.lineTo(st.x + 10, st.y - 55);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    });
}

// --- 3. ИНТЕРФЕЙС ---
function updateUI() {
    const list = document.getElementById('players-list');
    list.innerHTML = '';

    players.forEach(p => {
        const isActive = (p.id === getCurrentPlayer().id) ? 'active' : '';
        const div = document.createElement('div');
        div.className = `player-panel ${isActive}`;
        div.style.borderLeftColor = p.color;
        // Добавили вывод силы героя
        div.innerHTML = `
            <h3>${p.name}</h3>
            <div>Очки победы: <b>${p.points}</b></div>
            <div>Сила армии: <b>${p.armyStrength}</b></div>
            <div>Сила героя: <b>${p.heroPower}</b></div>
            <div>Ресурсы: 🐷${p.res.s} 🍄${p.res.g} 🔫${p.res.b}</div>
        `;
        list.appendChild(div);
    });

    document.getElementById('current-player-name').innerText = getCurrentPlayer().name;
    document.getElementById('current-player-name').style.color = getCurrentPlayer().color;

    const phaseNames = {1: "1. Ресурсы", 2: "2. Мобилизация", 3: "3. Атака", 4: "4. Герои"};
    document.getElementById('current-phase').innerText = phaseNames[currentPhase];

    document.getElementById('btn-buy-army').disabled = (currentPhase !== 2);
    document.getElementById('btn-next-phase').disabled = false;
    document.getElementById('btn-get-quest').disabled = (currentPhase !== 2 || getCurrentPlayer().quest !== null);

    const p = getCurrentPlayer();
    const questBox = document.getElementById('quest-box');
    if (p.quest) {
        questBox.innerHTML = `<b>${p.quest.text}</b><br>Прогресс: ${p.quest.progress} / ${p.quest.target}`;
        questBox.style.color = '#f1c40f';
    } else {
        questBox.innerHTML = `Нет активного задания`;
        questBox.style.color = '#fff';
    }
}

function logMessage(msg) {
    const logBox = document.getElementById('log');
    logBox.innerHTML += `<div>> ${msg}</div>`;
    logBox.scrollTop = logBox.scrollHeight;
}

function checkQuest(type) {
    const p = getCurrentPlayer();
    if (!p.quest) return;

    if (p.quest.type === type) {
        p.quest.progress++;
        logMessage(`📜 Прогресс задания: ${p.quest.progress}/${p.quest.target}`);

        if (p.quest.progress >= p.quest.target) {
            logMessage(`🏆 ЗАДАНИЕ ВЫПОЛНЕНО! ${p.name} получает 1 очко победы.`);
            p.points += 1;
            p.quest = null;
            updateUI();
        }
    }
}

// --- 4. КНОПКИ ---
document.getElementById('btn-get-quest').onclick = () => {
    const p = getCurrentPlayer();
    const randomQuest = JSON.parse(JSON.stringify(questsList[Math.floor(Math.random() * questsList.length)]));
    p.quest = randomQuest;
    logMessage(`📜 ${p.name} взял задание: "${p.quest.text}"`);
    updateUI();
};

document.getElementById('btn-buy-army').onclick = () => {
    const p = getCurrentPlayer();
    if (p.res.s >= 1 && p.res.b >= 1) {
        p.res.s -= 1;
        p.res.b -= 1;
        p.armyStrength += 1;
        logMessage(`${p.name} нанял солдата! Сила армии: ${p.armyStrength}`);
        updateUI();
    } else {
        logMessage("Недостаточно ресурсов (нужно 1 Свинья и 1 Патрон)!");
    }
};

document.getElementById('btn-next-phase').onclick = () => {
    const p = getCurrentPlayer();

    if (currentPhase === 1) {
        let gotRes = false;
        stations.filter(s => s.owner === p.id).forEach(st => {
            if (st.res === "свиньи") { p.res.s += 1; gotRes = true; }
            if (st.res === "грибы") { p.res.g += 1; gotRes = true; }
            if (st.res === "патроны") { p.res.b += 1; gotRes = true; checkQuest("bullets"); }
            if (st.res === "универсал") { p.res.s += 1; p.res.g += 1; p.res.b += 1; gotRes = true; checkQuest("bullets"); }
        });
        if (gotRes) logMessage(`${p.name} собрал ресурсы со своих станций.`);
        currentPhase = 2;

    } else if (currentPhase === 2) {
        logMessage(`${p.name} переходит к атаке.`);
        currentPhase = 3;

    } else if (currentPhase === 3) {
        logMessage(`${p.name} переходит к действиям героев.`);
        currentPhase = 4;

    } else if (currentPhase === 4) {
        logMessage(`--- Ход переходит к следующему игроку ---`);
        currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
        currentPhase = 1;
        selectedStation = null;
        resetMarket();
    }

    drawMap();
    updateUI();
};

// --- 5. КЛИКИ ПО КАРТЕ ---
canvas.addEventListener('click', (e) => {
    if (currentPhase !== 3 && currentPhase !== 4) {
        logMessage("Сейчас нельзя действовать!");
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let clickedStation = null;
    for (let st of stations) {
        if (Math.hypot(st.x - mouseX, st.y - mouseY) < 35) {
            clickedStation = st;
            break;
        }
    }

    if (!clickedStation) return;
    selectedStation = clickedStation;
    drawMap();

    const p = getCurrentPlayer();

    if (currentPhase === 4) {
        if (clickedStation.id === p.heroStation) {
            logMessage("Ваш герой уже здесь.");
            openHeroModal(clickedStation);
            return;
        }
        const currentHeroStation = stations.find(s => s.id === p.heroStation);
        if (currentHeroStation.neighbors.includes(clickedStation.id)) {
            p.heroStation = clickedStation.id;
            logMessage(`🕵️ Герой игрока ${p.name} переместился на станцию ${clickedStation.name}.`);
            updateUI();
            drawMap();
            openHeroModal(clickedStation);
        } else {
            logMessage("Герой может ходить только на соседние станции!");
        }
        return;
    }

    if (clickedStation.owner === p.id) {
        logMessage(`Это ваша станция.`);
        return;
    }

    const myStations = stations.filter(s => s.owner === p.id);
    const canAttack = myStations.some(mySt => mySt.neighbors.includes(clickedStation.id));

    if (!canAttack) {
        logMessage(`Нет ваших станций по соседству с ${clickedStation.name}!`);
        return;
    }

    if (clickedStation.owner === null) {
        attackTarget = clickedStation;
        drawThreatCard();
        return;
    }

    logMessage(`⚔️ ${p.name} атакует станцию ${clickedStation.name} игрока ${clickedStation.owner}!`);
    if (p.armyStrength > clickedStation.army) {
        logMessage(`✅ Победа! Станция захвачена.`);
        const prevOwner = players.find(pl => pl.id === clickedStation.owner);
        prevOwner.points -= 1;
        clickedStation.owner = p.id;
        clickedStation.army = 1;
        p.points += 1;

        checkQuest("conquest");

    } else {
        logMessage(`❌ Поражение! Защита станции упала.`);
        clickedStation.army -= 1;
        if (clickedStation.army < 1) clickedStation.army = 1;
    }

    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    currentPhase = 1;
    selectedStation = null;
    resetMarket();
    updateUI();
    drawMap();
});

// --- 6. ПОКУПКА КАРТОЧЕК ---
window.buyCard = function(cardId, costPigs, costBullets) {
    if (currentPhase !== 2) {
        alert("Покупать снаряжение можно только в Фазе 2 (Мобилизация)!");
        return;
    }
    const p = getCurrentPlayer();
    if (p.res.s >= costPigs && p.res.b >= costBullets) {
        p.res.s -= costPigs;
        p.res.b -= costBullets;

        // Теперь карточка увеличивает силу ГЕРОЯ
        p.heroPower += 1;

        const cardElement = document.getElementById('card-' + cardId);
        if (cardElement) {
            cardElement.classList.add('bought');
            cardElement.querySelector('.card-desc').innerText = "КУПЛЕНО";
        }
        logMessage(`🛒 ${p.name} купил снаряжение! Сила героя увеличена до ${p.heroPower}.`);
        updateUI();
    } else {
        alert("Недостаточно ресурсов для покупки!");
    }
};

// --- 7. ОБНОВЛЕНИЕ РЫНКА ---
function resetMarket() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('bought');
        if (card.id === 'card-akm' || card.id === 'card-armor') {
            card.querySelector('.card-desc').innerText = "+1 к силе героя";
        }
    });
}

// --- 8. КАРТЫ УГРОЗ ---
function drawThreatCard() {
    currentThreat = threatsList[Math.floor(Math.random() * threatsList.length)];
    document.getElementById('threat-name').innerText = currentThreat.name;
    document.getElementById('threat-desc').innerText = currentThreat.desc;
    document.getElementById('threat-power').innerText = currentThreat.power;
    document.querySelector('.threat-icon').innerText = currentThreat.icon;
    document.getElementById('threat-modal').classList.add('active');
}

function closeThreatModal() {
    document.getElementById('threat-modal').classList.remove('active');
    logMessage(`Вы отступили от станции ${attackTarget.name}.`);
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    currentPhase = 1;
    selectedStation = null;
    resetMarket();
    updateUI();
    drawMap();
}

function resolveThreatFight() {
    const p = getCurrentPlayer();
    document.getElementById('threat-modal').classList.remove('active');

    logMessage(`⚔️ Бой с угрозой "${currentThreat.name}"! (Ваша сила: ${p.armyStrength} vs Враг: ${currentThreat.power})`);

    if (p.armyStrength > currentThreat.power) {
        logMessage(`✅ Победа! Вы уничтожили угрозу и захватили ${attackTarget.name}.`);
        attackTarget.owner = p.id;
        attackTarget.army = 1;
        p.points += 1;

        checkQuest("conquest");
        checkQuest("threats");

    } else {
        logMessage(`❌ Поражение! Угроза отбросила ваши войска.`);
        p.armyStrength -= 1;
        if (p.armyStrength < 1) p.armyStrength = 1;
    }

    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    currentPhase = 1;
    selectedStation = null;
    resetMarket();
    updateUI();
    drawMap();
}

// --- 9. ДЕЙСТВИЯ ГЕРОЕВ ---
function openHeroModal(station) {
    heroTarget = station;
    document.getElementById('hero-target-name').innerText = station.name;

    const p = getCurrentPlayer();

    const btnAttack = document.getElementById('btn-hero-attack');
    if (station.owner === p.id) {
        btnAttack.style.display = 'none';
    } else {
        btnAttack.style.display = 'block';
    }

    const btnGather = document.getElementById('btn-hero-gather');
    if (station.owner !== null && station.owner !== p.id) {
        btnGather.style.display = 'none';
    } else {
        btnGather.style.display = 'block';
    }

    document.getElementById('hero-modal').classList.add('active');
}

function heroAttack() {
    document.getElementById('hero-modal').classList.remove('active');
    const p = getCurrentPlayer();

    // Теперь герой использует свою прокачанную силу
    const heroPower = p.heroPower;

    logMessage(`⚔️ Герой ${p.name} атакует станцию ${heroTarget.name}! (Сила героя: ${heroPower} vs Защита: ${heroTarget.army})`);

    if (heroPower > heroTarget.army) {
        logMessage(`✅ Победа! Герой захватил ${heroTarget.name}.`);
        if (heroTarget.owner) {
            const prevOwner = players.find(pl => pl.id === heroTarget.owner);
            prevOwner.points -= 1;
        }
        heroTarget.owner = p.id;
        heroTarget.army = 1;
        p.points += 1;

        checkQuest("conquest");
    } else {
        logMessage(`❌ Поражение! Герой ранен и отправляется домой.`);
        p.heroStation = 1;
    }
    endHeroTurn();
}

function heroGather() {
    document.getElementById('hero-modal').classList.remove('active');
    const p = getCurrentPlayer();

    p.res.b += 1;
    logMessage(`⛏️ Герой ${p.name} собрал 1 патрон на станции ${heroTarget.name}.`);
    checkQuest("bullets");

    endHeroTurn();
}

function endHeroTurn() {
    document.getElementById('hero-modal').classList.remove('active');

    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    currentPhase = 1;
    selectedStation = null;
    resetMarket();
    updateUI();
    drawMap();
}

// --- СТАРТ ИГРЫ ---
drawMap();
updateUI();
logMessage("Игра началась! Сейчас Фаза 1. Нажмите 'Следующая фаза', чтобы собрать ресурсы.");