function assert(exp, message) {
    if (!exp) throw message;
}

function dump(obj) {
	return JSON.stringify(obj, null, '\t');
}

var MathUtil = {
    factorial: function (n) {
        if (n <= 1) return 1;
        return n * this.factorial(n - 1);
    },
	permutation: function (n, k) {
        return this.factorial(n) / this.factorial(n - k);
    },
	combination: function (n, k) {
        return this.permutation(n, k) / this.factorial(k);
    }
};

Array.prototype.contains = function (item) {
    for (var i = 0; i < this.length; i++) {
        if (item == this[i]) return true;
    }
    return false;
};

Array.prototype.isUnique = function() {
	var uniqueArray = [];
	for(var i = 0; i < this.length; i++) {
		if(uniqueArray.contains(this[i])) return false;
		uniqueArray.push(this[i]);
	}
	return true;
};
  
function CouponItem(id, mbs, oddValue, isBank) {
    this.id = id;
    this.mbs = mbs;
    this.oddValue = oddValue;
    this.isBank = isBank;
}

function Coupon(items) {
    var items = items || [];
    for (var i = 0; i < items.length; i++) {
        this.push(items[i]);
    }
};

function CouponInvalidException() {
	this.description = 'Coupon is not valid';
}
CouponInvalidException.prototype = new Error;

Coupon.prototype = new Array;

Coupon.__MINMULTIPLIER = 2;

Coupon.prototype.evalMinMbs = function () {
    if (this.length == 0) return 0;
    var minMbs = this[0].mbs;
    for (var i = 0; i < this.length; i++) {
		minMbs = Math.min(this[i].mbs, minMbs);
	}
    return minMbs;
};

Coupon.prototype.evalMaxMbs = function () {
    if (this.length == 0) return 0;
    var maxMbs = this[0].mbs;
    for (var i = 0; i < this.length; i++)
    maxMbs = Math.max(this[i].mbs, maxMbs);
    return maxMbs;
};

Coupon.prototype.evalMbsCount = function (mbs) {
    var mbsCount = 0;
    for (var i = 0; i < this.length; i++) {
        if (this[i].mbs == mbs) {
            mbsCount++;
        }
    }
    return mbsCount;
};

Coupon.prototype.findItems = function (isBank) {
    var bankItems = [];
    for (var i = 0; i < this.length; i++) {
        if (!(this[i].isBank ^ isBank)) {
            bankItems.push(this[i]);
        }
    }
    return bankItems;
};

Coupon.prototype.validate = function () {
    var minMbs = this.evalMinMbs();
    var minMbsCount = this.evalMbsCount(minMbs);
	return minMbs <= minMbsCount || this.length >= this.evalMaxMbs();
};

Coupon.prototype.eachCombination = function (k, callback) {
    function iterateCombination(comb, n, k) {
        if (!comb) return (function () {
            var firstComb = [];
            for (var j = 0; j < k; j++) {
                firstComb[j] = j;
            }
            return firstComb;
        })();
		var i = k - 1;
		++comb[i];
		while ((i >= 0) && (comb[i] >= n - k + 1 + i)) {
			--i;
			++comb[i];
		}

		if (comb[0] > n - k) return null;

		for (i = i + 1; i < k; ++i)
		comb[i] = comb[i - 1] + 1;
        return comb;
    }
    var bankItems = this.findItems(true);
	if(!k) {
		callback(new Coupon(bankItems));
		return;
	}
    var plainItems = this.findItems(false);
    var mapper;
    while ((mapper = iterateCombination(mapper, plainItems.length, k))) {
        var combination = new Coupon(bankItems);
        for (var i = 0; i < mapper.length; i++) {
            combination.push(plainItems[mapper[i]]);
        }
        if (!callback(combination)) {
            break;
        }
    }
};

Coupon.prototype.evalAvailableSystems = function (systems) {
    var availableSystems = [];
    var bankItems = this.findItems(true);
    var plainItems = this.findItems(false);
	var bankItemsCoupon = new Coupon(bankItems);
	if(systems && systems.length && bankItemsCoupon.validate()) {
		if(!(systems.length == 1 && systems[0] == 0)) {
			availableSystems.push(0);
		}
	}
    for (var k = 1; k <= plainItems.length; k++) {
        if (MathUtil.combination(plainItems.length, k) < 1000) {
            var validSystemValue = true;
            this.eachCombination(k, function (coupon) {
                validSystemValue = validSystemValue && coupon.validate();
                return validSystemValue;
            });
            if (validSystemValue && !availableSystems.contains(k)) {
                availableSystems.push(k);
            }
        }
    }
    return availableSystems;
};

Coupon.prototype.evalColumnCount = function (systems) {
    if (systems && systems.length) {
        var columnCount = 0;
        var plainItems = this.findItems(false);
        for (var i = 0; i < systems.length; i++) {
            columnCount += MathUtil.combination(plainItems.length, systems[i]);
        }
        return columnCount;
    }
    return 1;
};

Coupon.prototype.evalProduct = function (systems) {
    var product = 1;
    if (systems && systems.length) {
        product = 0;
        for (var i = 0; i < systems.length; i++) {
            this.eachCombination(systems[i], function (coupon) {
                product += coupon.evalProduct();
                return true;
            });
        }
    } else {
        for (var i = 0; i < this.length; i++) {
            product *= this[i].oddValue;
        }
    }
	return product;
}

Coupon.prototype.eval = function (multiplier, systems) {
	if (!this.validate()) { throw new CouponInvalidException(0, 'coupon is not valid'); }
    var multiplier = multiplier
		? Math.floor(Math.max(multiplier, Coupon.__MINMULTIPLIER))
		: Coupon.__MINMULTIPLIER;
    var availableSystems = this.evalAvailableSystems(systems);
	if(systems && systems.length) {
		for(var i = 0; i < systems.length; i++) {
			if(!availableSystems.contains(systems[i])) {
				throw new CouponInvalidException(0, 'system values out of range of available system values');
			}
		}
	}
	if(!systems.isUnique()) throw new CouponInvalidException(0, 'coupon has duplicate system values');
    var product = this.evalProduct(systems);
    var columnCount = this.evalColumnCount(systems);
    var amount = product * multiplier;
    var cost = multiplier * columnCount;
    var count = this.length;
    return {
        count: count,
        multiplier: multiplier,
        cost: cost,
        columnCount: columnCount,
        product: product,
        amount: amount,
        systems: systems,
        availableSystems: availableSystems
    };
};