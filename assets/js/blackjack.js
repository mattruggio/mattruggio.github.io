/*
  Blackjack. No dependencies, no build step, no network.

  House rules, all of them the common player-friendly set:

    - Six-deck shoe, reshuffled when fewer than one deck remains.
    - Dealer stands on all 17, including soft 17.
    - Blackjack pays 3:2. Player blackjack against dealer blackjack pushes.
    - Dealer peeks: when the upcard can make 21 the hole card is checked before
      the player acts, so nobody doubles into a blackjack that already existed.
    - Double down on the first two cards only, one card, then the hand stands.
    - No split, no insurance, no surrender.

  Suits are drawn as inline SVG rather than written as characters. The site's
  fonts are subset to Latin, so U+2660..2667 are not in them; the browser would
  fall back per glyph, and on a good number of systems that fallback is colour
  emoji. SVG renders identically everywhere and inherits currentColor.
*/
(function () {
  'use strict';

  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var SUITS = [
    { id: 'spades',   name: 'spades',   red: false },
    { id: 'hearts',   name: 'hearts',   red: true  },
    { id: 'diamonds', name: 'diamonds', red: true  },
    { id: 'clubs',    name: 'clubs',    red: false }
  ];

  var SUIT_PATHS = {
    spades: 'M50 6 C50 6 14 36 14 56 C14 68 23 77 34 77 C41 77 46 73 49 68 C49 68 47 82 36 92 L64 92 C53 82 51 68 51 68 C54 73 59 77 66 77 C77 77 86 68 86 56 C86 36 50 6 50 6 Z',
    hearts: 'M50 90 C50 90 10 62 10 36 C10 21 21 10 34 10 C42 10 48 15 50 21 C52 15 58 10 66 10 C79 10 90 21 90 36 C90 62 50 90 50 90 Z',
    diamonds: 'M50 6 L86 50 L50 94 L14 50 Z',
    /* Every subpath winds the same way on purpose. Mixing directions makes the
       nonzero fill rule cancel the overlaps and cut slits into the shape. */
    clubs: 'M50 10 a18 18 0 1 1 0 36 a18 18 0 1 1 0 -36 Z M30 34 a18 18 0 1 1 0 36 a18 18 0 1 1 0 -36 Z M70 34 a18 18 0 1 1 0 36 a18 18 0 1 1 0 -36 Z M44 40 h12 c0 22 3 36 10 52 h-32 c7 -16 10 -30 10 -52 Z'
  };

  var DECKS = 6;
  var MIN_BET = 5;
  var BET_STEP = 5;
  var STARTING_BANKROLL = 100;
  var STORE_BANKROLL = 'bj.bankroll';
  var STORE_BET = 'bj.bet';

  var shoe = [];
  var player = [];
  var dealer = [];
  var bankroll = STARTING_BANKROLL;
  var bet = 10;
  var phase = 'betting';
  var doubled = false;
  var revealDealer = false;

  var el = {};

  /* Storage is wrapped because Safari throws on localStorage in some private
     modes, and a game that refuses to load is worse than one that forgets. */
  function load(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      var n = parseInt(raw, 10);
      return isFinite(n) ? n : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (e) { /* not fatal */ }
  }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      /* Rejection sampling: taking a raw 32-bit value modulo `max` biases the
         low end whenever max does not divide 2^32 evenly. */
      var limit = Math.floor(0x100000000 / max) * max;
      var buf = new Uint32Array(1);
      do { window.crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function buildShoe() {
    var cards = [];
    for (var d = 0; d < DECKS; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) {
          cards.push({ rank: RANKS[r], suit: SUITS[s] });
        }
      }
    }
    for (var i = cards.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
    }
    return cards;
  }

  function draw() {
    if (shoe.length === 0) shoe = buildShoe();
    return shoe.pop();
  }

  /* Aces start at 11 and are demoted one at a time while the hand is bust.
     That is the whole of soft and hard handling. */
  function score(cards) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].rank;
      if (r === 'A') { aces++; total += 11; }
      else if (r === 'J' || r === 'Q' || r === 'K') { total += 10; }
      else { total += parseInt(r, 10); }
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return { total: total, soft: aces > 0 && total <= 21 };
  }

  function isBlackjack(cards) {
    return cards.length === 2 && score(cards).total === 21;
  }

  /* Everything below is built with createElement and textContent. Nothing here
     is attacker-controlled today, but a render loop that concatenates innerHTML
     is the kind of thing that quietly becomes a hole later. */
  function suitSvg(suitId) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'bj-suit');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', SUIT_PATHS[suitId]);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  function cardEl(card, faceDown) {
    var div = document.createElement('div');
    div.className = 'bj-card';
    div.setAttribute('role', 'img');

    if (faceDown) {
      div.className += ' bj-card--back';
      div.setAttribute('aria-label', 'Face-down card');
      return div;
    }

    if (card.suit.red) div.className += ' bj-card--red';
    div.setAttribute('aria-label', card.rank + ' of ' + card.suit.name);

    var top = document.createElement('span');
    top.className = 'bj-card-rank';
    top.textContent = card.rank;

    var pip = document.createElement('span');
    pip.className = 'bj-card-pip';
    pip.appendChild(suitSvg(card.suit.id));

    var foot = document.createElement('span');
    foot.className = 'bj-card-rank bj-card-rank--foot';
    foot.textContent = card.rank;

    div.appendChild(top);
    div.appendChild(pip);
    div.appendChild(foot);
    return div;
  }

  function renderHand(node, cards, hideHole) {
    node.textContent = '';
    for (var i = 0; i < cards.length; i++) {
      node.appendChild(cardEl(cards[i], hideHole && i === 1));
    }
  }

  function scoreLabel(cards) {
    var s = score(cards);
    if (isBlackjack(cards)) return 'blackjack';
    if (s.total > 21) return s.total + ' bust';
    return s.soft ? 'soft ' + s.total : String(s.total);
  }

  function render() {
    var hideHole = !revealDealer;

    renderHand(el.dealerHand, dealer, hideHole);
    renderHand(el.playerHand, player, false);

    el.dealerScore.textContent = dealer.length === 0 ? ''
      : hideHole ? score([dealer[0]]).total + ' + ?'
      : scoreLabel(dealer);
    el.playerScore.textContent = player.length === 0 ? '' : scoreLabel(player);

    el.bankroll.textContent = String(bankroll);
    el.bet.textContent = String(bet);
    el.shoeCount.textContent = String(shoe.length);

    var betting = phase === 'betting';
    var playing = phase === 'player';
    var broke = bankroll < MIN_BET;

    el.deal.hidden = !betting;
    el.betUp.hidden = !betting;
    el.betDown.hidden = !betting;
    el.hit.hidden = !playing;
    el.stand.hidden = !playing;
    el.double.hidden = !playing;
    el.next.hidden = phase !== 'settled';
    el.reset.hidden = !(betting && broke);

    el.deal.disabled = broke;
    el.betUp.disabled = bet + BET_STEP > bankroll;
    el.betDown.disabled = bet - BET_STEP < MIN_BET;
    /* Doubling needs a second stake behind it. */
    el.double.disabled = player.length !== 2 || bankroll < bet;
  }

  function say(text, tone) {
    el.status.textContent = text;
    el.status.className = 'bj-status' + (tone ? ' bj-status--' + tone : '');
  }

  function newHand() {
    if (phase !== 'betting' || bankroll < MIN_BET) return;

    /* Prefixed to the opening message rather than shown on its own, so the
       reshuffle does not blank out the prompt the player needs. */
    var opening = '';
    if (shoe.length < 52) {
      shoe = buildShoe();
      opening = 'Shuffling a fresh six-deck shoe. ';
    }

    if (bet > bankroll) bet = bankroll - (bankroll % BET_STEP);

    bankroll -= bet;
    doubled = false;
    revealDealer = false;
    player = [draw(), draw()];
    dealer = [draw(), draw()];
    phase = 'player';

    var up = dealer[0];
    var upCanMake21 = up.rank === 'A' || score([up]).total === 10;

    if (isBlackjack(player) && isBlackjack(dealer)) {
      revealDealer = true;
      settle('push', opening + 'Both blackjack. Push.');
      return;
    }
    if (isBlackjack(player)) {
      revealDealer = true;
      /* 3:2, and the original stake comes back with it. */
      settle('win', opening + 'Blackjack. Paid 3 to 2.', bet + Math.floor(bet * 3 / 2));
      return;
    }
    /* The peek, taken only when the upcard could actually be part of 21 so the
       dealer never leaks anything about an ordinary hole card. */
    if (upCanMake21 && isBlackjack(dealer)) {
      revealDealer = true;
      settle('lose', opening + 'Dealer has blackjack.');
      return;
    }

    say(opening + 'Hit, stand, or double.', null);
    render();
    focusFirstAction();
  }

  function hit() {
    if (phase !== 'player') return;
    player.push(draw());
    var total = score(player).total;
    if (total > 21) {
      revealDealer = true;
      settle('lose', 'Bust with ' + total + '.');
      return;
    }
    if (total === 21) { stand(); return; }
    say('Hit or stand.', null);
    render();
  }

  function double() {
    if (phase !== 'player' || player.length !== 2 || bankroll < bet) return;
    bankroll -= bet;
    bet *= 2;
    doubled = true;
    player.push(draw());
    var total = score(player).total;
    if (total > 21) {
      revealDealer = true;
      settle('lose', 'Doubled and bust with ' + total + '.');
      return;
    }
    stand();
  }

  function stand() {
    if (phase !== 'player') return;
    phase = 'dealer';
    revealDealer = true;
    while (score(dealer).total < 17) dealer.push(draw());

    var p = score(player).total;
    var d = score(dealer).total;

    if (d > 21) settle('win', 'Dealer busts with ' + d + '.', bet * 2);
    else if (p > d) settle('win', 'You win, ' + p + ' against ' + d + '.', bet * 2);
    else if (p < d) settle('lose', 'Dealer wins, ' + d + ' against ' + p + '.');
    else settle('push', 'Push on ' + p + '.');
  }

  /* `returned` is the total handed back, stake included, so a plain win returns
     twice the stake and a push returns it once. */
  function settle(result, message, returned) {
    bankroll += returned || (result === 'push' ? bet : 0);
    if (doubled) bet /= 2;
    phase = 'settled';
    save(STORE_BANKROLL, bankroll);
    save(STORE_BET, bet);
    say(message, result);
    render();
    el.next.focus();
  }

  function nextHand() {
    if (phase !== 'settled') return;
    phase = 'betting';
    player = [];
    dealer = [];
    revealDealer = false;
    if (bankroll < MIN_BET) {
      say('Out of chips. Reset to start again with ' + STARTING_BANKROLL + '.', 'lose');
    } else {
      if (bet > bankroll) bet = bankroll - (bankroll % BET_STEP);
      say('Place your bet and deal.', null);
    }
    render();
    focusFirstAction();
  }

  function resetBank() {
    bankroll = STARTING_BANKROLL;
    bet = 10;
    save(STORE_BANKROLL, bankroll);
    save(STORE_BET, bet);
    say('Back to ' + STARTING_BANKROLL + ' chips.', null);
    render();
    focusFirstAction();
  }

  function adjustBet(delta) {
    if (phase !== 'betting') return;
    var next = bet + delta;
    if (next < MIN_BET || next > bankroll) return;
    bet = next;
    save(STORE_BET, bet);
    render();
  }

  function focusFirstAction() {
    var first = phase === 'betting' ? el.deal : el.hit;
    if (first && !first.hidden && !first.disabled) first.focus();
  }

  function toggleHelp(force) {
    var open = typeof force === 'boolean' ? force : el.rules.hidden;
    el.rules.hidden = !open;
    el.help.setAttribute('aria-expanded', String(open));
    if (open) el.rules.focus();
    else el.help.focus();
  }

  function init() {
    var root = document.getElementById('blackjack');
    if (!root) return;

    var ids = ['dealerHand', 'playerHand', 'dealerScore', 'playerScore', 'status',
               'bankroll', 'bet', 'shoeCount', 'deal', 'hit', 'stand', 'double',
               'next', 'reset', 'betUp', 'betDown', 'help'];
    for (var i = 0; i < ids.length; i++) {
      el[ids[i]] = root.querySelector('[data-bj="' + ids[i] + '"]');
      if (!el[ids[i]]) return;
    }
    /* The rules live outside the game section so they survive with JavaScript
       off, so this one is looked up against the document. */
    el.rules = document.querySelector('[data-bj="rules"]');
    if (!el.rules) return;

    bankroll = load(STORE_BANKROLL, STARTING_BANKROLL);
    bet = load(STORE_BET, 10);
    if (bankroll < 0) bankroll = STARTING_BANKROLL;
    if (bet < MIN_BET) bet = MIN_BET;
    if (bet > bankroll) bet = Math.max(MIN_BET, bankroll - (bankroll % BET_STEP));

    shoe = buildShoe();

    el.deal.addEventListener('click', newHand);
    el.hit.addEventListener('click', hit);
    el.stand.addEventListener('click', stand);
    el.double.addEventListener('click', double);
    el.next.addEventListener('click', nextHand);
    el.reset.addEventListener('click', resetBank);
    el.betUp.addEventListener('click', function () { adjustBet(BET_STEP); });
    el.betDown.addEventListener('click', function () { adjustBet(-BET_STEP); });
    el.help.addEventListener('click', function () { toggleHelp(); });

    /* Shortcuts sit on top of the buttons, never instead of them. Ignored while
       a form field or a modifier is in play so they cannot hijack typing or a
       browser shortcut. */
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      var key = e.key.toLowerCase();
      var acted = true;
      if (key === '?') toggleHelp();
      else if (key === 'escape' && !el.rules.hidden) toggleHelp(false);
      else if (phase === 'player' && key === 'h') hit();
      else if (phase === 'player' && key === 's') stand();
      else if (phase === 'player' && key === 'd') double();
      else if (phase === 'betting' && (key === 'enter' || key === 'd')) newHand();
      else if (phase === 'betting' && (key === 'arrowup' || key === '+' || key === '=')) adjustBet(BET_STEP);
      else if (phase === 'betting' && (key === 'arrowdown' || key === '-')) adjustBet(-BET_STEP);
      else if (phase === 'settled' && (key === 'enter' || key === 'n')) nextHand();
      else acted = false;

      if (acted) e.preventDefault();
    });

    root.hidden = false;
    /* Folded away only now, so a reader without JavaScript keeps them. */
    el.rules.hidden = true;
    el.rules.setAttribute('tabindex', '-1');
    var fallback = document.getElementById('bj-nojs');
    if (fallback) fallback.hidden = true;

    say('Place your bet and deal.', null);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
