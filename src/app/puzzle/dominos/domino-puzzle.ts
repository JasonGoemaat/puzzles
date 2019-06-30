import { isNumber } from 'util';

const KEYS = {
    LEFT: 37,
    RIGHT: 39,
    UP: 38,
    DOWN: 40,
    RETURN: 13,
    BACKSPACE: 8,
    ESC: 27
};

export class DominoPuzzle {
    width: number;
    height: number;
    state: string = 'creating';
    digits: number[] = [];
    pos: string[] = [];
    max: number; // i.e. 3 when 0,1,2,3 digits
    count: number; // i.e. 4 when 0,1,2,3 digits
    position: number = 0;
    isDouble: boolean[] = [];

    constructor() {}

    static FromString(digits: string): DominoPuzzle {
        let puzzle = new DominoPuzzle();
        if (digits) {
            puzzle.digits = Array.from(digits).map((x: string) => parseInt(x));
            puzzle.pos = puzzle.digits.map(x => '');
        }
        return puzzle;
    }

    getRows(): DominoSquare[][] {
        // highest digit 8, then 10x9
        let highest = 0;
        for (let i = 0; i < this.digits.length; i++) {
            highest = Math.max(highest, this.digits[i]);
        }
        this.max = highest;
        this.count = highest + 1;
        this.width = highest + 2;
        this.height = highest + 1;
        if (!this.width || !this.height) {
            return [];
        }

        let rows = [];
        let cols = [];
        let size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            let digit: any = i < this.digits.length ? this.digits[i] : -1;
            let pos = i < this.pos.length ? this.pos[i] : '';
            if (i === this.pos.length) {
                digit = -2;
            }
            if ((i % this.width) === 0) {
                if (cols.length > 0) {
                    rows.push(cols);
                    cols = [];
                }
            }
            cols.push(<DominoSquare>{ digit, pos, active: this.position === i, isDouble : this.isDouble[i] });
        }
        if (cols.length > 0) {
            rows.push(cols);
        }
        return rows;
    }

    handleKeyCode(keyCode: number) {
        if (keyCode == KEYS.ESC) {
            this.reset();
            return;
        }

        if (keyCode >= 48 && keyCode <= 57) {
            this.addDigit(keyCode - 48);
            return;
        }

        if (keyCode >= 96 && keyCode <= 105) {
            this.addDigit(keyCode - 96);
            return;
        }

        if (keyCode === KEYS.BACKSPACE && this.position > 0) {
            this.position--;
            return;
        }

        if (keyCode === KEYS.DOWN && this.position < (this.width * this.height - this.width)) {
            this.position += this.width;
            return;
        }

        if (keyCode == KEYS.RIGHT && (this.position % this.width < this.width - 1)) {
            this.position++;
            return;
        }

        if (keyCode == KEYS.LEFT && (this.position % this.width > 0)) {
            this.position--;
            return;
        }

        if (keyCode === KEYS.UP && this.position >= this.height) {
            this.position -= this.width;
            return;
        }
    }

    addDigit(digit: number) {
        let position = this.position;
        if (position >= this.digits.length) {
            this.digits.push(digit);
            this.pos.push('');
        } else {
            this.digits[position] = digit;
            this.pos[position] = '';
        }
        this.position++;

        // auto-solve
        // if (this.position >= this.digits.length) {
        //     this.solve();
        // }
        //console.log('digit:', digit, 'digits:', this.digits);
    }

    reset() {
        this.digits = [];
        this.pos = [];
        this.isDouble = [];
        this.width = 0;
        this.height = 0;
    }

    solve() {
        let start = window.performance.now();

        // say highest is 3, we have 0,0-3, 1,0-3
        // 0-3 (highest = 3) gives 5 columns, 4 rows
        //  that gives 5-1=4 horizontal possibilities for each row
        //  and 4-1=3 vertical possibilities for each column so 4*4 and 3*5, so 31 total possibilities
        // there will only be 10 ACTUAL dominos however
        let all: Domino[] = []; // 
        let { width, height, digits, max, count, pos } = this;
        if (digits.length < 6 || digits.length != width * height) {
            return;
        }
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width - 1; col++) {
                all.push(new Domino(digits, row * width + col, row * width + col + 1));
            }
        }
        for (let col = 0; col < width; col++) {
            for (let row = 0; row < height - 1; row++) {
                all.push(new Domino(digits, row * width + col, row * width + col + width));
            }
        }

        let byDigits = [];
        let combos = <Combo[]>[];
        for (let hd = this.max; hd >= 0; hd--) {
            for (let ld = hd; ld >= 0; ld--) {
                let index = combos.length;
                byDigits[hd * count + ld] = index;
                combos.push(new Combo(hd, ld));
            }
        }

        // now populate dominos property of combos
        for (let i = 0; i < all.length; i++) {
            let domino = all[i];
            let comboIndex = byDigits[domino.hd * count + domino.ld];
            let combo = combos[comboIndex];
            combo.dominos.push(domino);
        }

        // sort combos by number of dominos
        combos.sort((a, b) => {
            if (a.dominos.length < b.dominos.length) {
                return 1;
            }
            if (a.dominos.length > b.dominos.length) {
                return -1;
            }
            return 0;
        });

        // set up array telling when a square is used
        let used: boolean[] = [];
        for (let i = 0; i < digits.length; i++) {
            used.push(false);
        }

        // path to solution, list of dominos
        let path: Domino[] = [];
        let initialComboLength = combos.length;

        window['combos'] = [...combos];

        let tryCombo = (): boolean => {
            let combo = combos.pop();
            if (!combo) {
                return true; // made it through all combos, we found it!
            }

            //console.log(`combo: ${combo.ld}-${combo.hd}`);

            for (let i = 0; i < combo.dominos.length; i++) {
                let domino = combo.dominos[i];
                if (used[domino.li] || used[domino.hi]) {
                    continue;
                }
                // console.log(`  domino ${domino.li},${domino.hi}`);
                // we found a domino, mark digits as used
                used[domino.li] = used[domino.hi] = true;
                path.push(domino);
                if (tryCombo()) {
                    return true;
                }
                used[domino.li] = used[domino.hi] = false;
                path.pop();
            }

            // none of these worked!
            combos.push(combo);
            return false;
        };

        let mark = (a, b) => {
            if (a == b - 1) {
                pos[a] = 'r'; pos[b] = 'l';
            } else if (b == a - 1) {
                pos[a] = 'l'; pos[b] = 'r';
            } else if (a === b - width) {
                pos[a] = 'd'; pos[b] = 'u';
            } else {
                pos[a] = 'u'; pos[b] = 'd';
            }
            if (digits[a] == digits[b]) {
                this.isDouble[a] = this.isDouble[b] = true;
            }
        };

        let end = window.performance.now();
        console.log(`That just took ${end - start} ms`);

        if (tryCombo()) {
            // solved!
            console.log('%cSOLVED%c path:', 'color: blue; font-size: xx-large;', '', path);
            this.isDouble = [];
            all.forEach(x => this.isDouble.push(false));
            path.forEach(d => mark(d.li, d.hi));
        } else {
            console.log('No solution!');
        }
    }
}

export class DominoSquare {
    digit: number;
    pos: string = null;
    active: boolean;
    isDouble: boolean;
}

export class Domino {
    li: number; // low digit index
    hi: number; // high digit index
    ld: number; // low digit
    hd: number; // high digit

    constructor(arr: number[], a: number, b: number) {
        if (arr[a] < arr[b]) {
            this.li = a;
            this.hi = b;
        } else {
            this.li = b;
            this.hi = a;
        }
        this.ld = arr[this.li];
        this.hd = arr[this.hi];
    }
}

export class Combo {
    ld: number;
    hd: number;
    dominos: Domino[];
    index: number = 0;

    constructor(hd: number, ld: number) {
        this.hd = hd;
        this.ld = ld;
        this.dominos = [];
    }
}

/*

So all has array of { li (low index), hi (high index), ld (low digit), hd (high digit) }
This represents all POSSIBLE dominoes, so if high digit is 3, we have 5x4 area with 31 POSSIBLE dominoes

Try sorted combos

tryCombo() {
    let c = combos.pop();
    try each index()
}

*/