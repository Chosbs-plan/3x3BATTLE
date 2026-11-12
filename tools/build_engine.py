#!/usr/bin/env python3
"""index.html의 규칙 엔진(카드·직업·판정)을 서버 대전 함수용 engine.js로 뽑는다.

규칙을 고친 뒤에는 이 스크립트를 다시 돌리고 supabase/functions/duel 을 다시 배포해야
서버 판정이 화면과 같아진다.  사용: python3 tools/build_engine.py
"""
import hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, 'supabase', 'functions', 'duel', 'engine.js')

s = open(SRC, encoding='utf-8').read()
a = s.index('const CARDS = {')
b = s.index('const SND = (() => {')
seg = s[a:b]
ver = hashlib.sha1(seg.encode('utf-8')).hexdigest()[:10]

# 엔진 구간에는 화면 코드가 조금 섞여 있다(스킨 저장, 마우스 위치 등). 서버에서는 아무 일도 하지 않게 막는다
stub = '''/* 자동 생성: tools/build_engine.py 가 index.html 에서 뽑은 규칙 엔진. 직접 고치지 말 것 */
const document = { addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, elementFromPoint() { return null; }, documentElement: { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } }, body: { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } } };
const window = {}, navigator = {}, location = { href: '' };
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} }, sessionStorage = localStorage;
const MutationObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };
const requestAnimationFrame = () => 0, getComputedStyle = () => ({}), matchMedia = () => ({ matches: false, addEventListener() {} });
'''
out = stub + seg + '\nexport const ENGINE_VER = %r;\nexport { CARDS, CLS, CLASS_IDS, newGame, resolve, botPlan };\n' % ver
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(out)
print('engine.js', ver, len(out), 'bytes')
