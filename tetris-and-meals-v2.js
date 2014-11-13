People = new Meteor.Collection('people');
History = new Meteor.Collection('history');

if (Meteor.isClient) {
	Router.onRun(function() {
		Session.set('selectedPeople', []);
		Session.set('selectedPerson', null);
		Session.set('mealType', null);
		this.next();
	});

	var debugOn = function() {
		return Session.get('debug');
	};

	Template.list.helpers({
		people: function() {
			return People.find();
		},
		time: function() {
			return moment().format('hh:mm A');
		},
		debugOn: debugOn
	});

	Template.person.helpers({
		selected: function() {
			var selectedPeople = Session.get('selectedPeople');
			return _.contains(selectedPeople, this._id) ? 'selected' : '';
		},
		debugOn: debugOn
	});

	Template.person.events({
		'click': function() {
			var selectedPeople = Session.get('selectedPeople');
			var selectedPersonId = this._id;
			if (_.contains(selectedPeople, selectedPersonId))
				Session.set('selectedPeople', _.reject(selectedPeople, function(id) {
					return id === selectedPersonId;
				}));
			else
				Session.set('selectedPeople', selectedPeople.concat(this._id));
		}
	});

	Template.actions.helpers({
		peopleSelected: function() {
			return Session.get('selectedPeople').length > 1;
		}
	});

	Template.singleSelection.helpers({
		people: function() {
			return People.find();
		}
	});

	Template.singlePerson.helpers({
		selected: function() {
			return Session.get('selectedPerson') === this._id ? 'selected' : '';
		},
		debugOn: debugOn
	});

	Template.singlePerson.events({
		'click': function() {
			var selectedPerson = Session.get('selectedPerson');
			var selectedPersonId = this._id;
			if (selectedPerson === selectedPersonId)
				Session.set('selectedPerson', null);
			else
				Session.set('selectedPerson', selectedPersonId);
		}
	});

	Template.mealType.helpers({
		lunchSelected: function() {
			return Session.get('mealType') === 'Lunch' ? 'selected' : '';
		},
		dinnerSelected: function() {
			return Session.get('mealType') === 'Dinner' ? 'selected' : '';
		}
	});

	Template.addPayment.helpers({
		formValid: function() {
			return Session.get('selectedPeople').length > 1 &&
				Session.get('selectedPerson') != null &&
				_.contains(Session.get('selectedPeople'), Session.get('selectedPerson')) &&
				Session.get('mealType') != null;
		}
	})

	Template.history.helpers({
		people: function () {
			return People.find();
		},
		history: function () {
			return History.find({}, { sort: { time: -1 }, limit: 50});
		},
		paid: function (row) {
			return row.paid === this._id;
		},
		profited: function (row) {
			return row.paid !== this._id && row.people.indexOf(this._id) !== -1;
		},
		paidText: function (row) {
			return new Array(row.people.length).join('-');
		},
		profitedText: function () {
			return '+';
		},
	});

	Template.addPayment.events({
		'click #submit': function() {
			var selectedPeople = People.find({
				_id: {
					$in: Session.get('selectedPeople')
				}
			}).fetch();
			var isLunch = Session.get('mealType') === 'Lunch';
			var selectedPerson = People.findOne(Session.get('selectedPerson'));
			if (isLunch)
				Meteor.call('updateLunchScores', selectedPerson, selectedPeople);
			else
				Meteor.call('updateDinnerScores', selectedPerson, selectedPeople);
			Session.set('selectedPeople', []);
			Session.set('selectedPerson', null);
			Session.set('mealType', '');
		}
	});

	Template.mealType.events({
		'click h1': function(event) {
			Session.set('mealType', event.target.textContent);
		}
	});

	Template.actions.events({
		'click button': function() {
			var selectedPeople = People.find({
				_id: {
					$in: Session.get('selectedPeople')
				}
			}).fetch();
			var isLunch = moment().isBefore(moment('2:30 PM', 'h:mm A'));
			var selectedPerson;
			if (isLunch) {
				var maxLunchScore = _.max(selectedPeople, function(person) {
					return person.lunchScore;
				}).lunchScore;
				var eligiblePeople = _.groupBy(selectedPeople, 'lunchScore')[maxLunchScore];
				selectedPerson = _.sample(eligiblePeople);
				if (confirm('It\'s ' + selectedPerson.name + '\'s turn to pay!'))
					Meteor.call('updateLunchScores', selectedPerson, selectedPeople);
			} else {
				var maxDinnerScore = _.max(selectedPeople, function(person) {
					return person.dinnerScore;
				}).dinnerScore;
				var eligiblePeople = _.groupBy(selectedPeople, 'dinnerScore')[maxDinnerScore];
				selectedPerson = _.sample(eligiblePeople);
				if (confirm('It\'s ' + selectedPerson.name + '\'s turn to pay!'))
					Meteor.call('updateDinnerScores', selectedPerson, selectedPeople);
			}
			Session.set('selectedPeople', []);
		}
	});
}

Meteor.methods({
	updateLunchScores: function(selectedPerson, selectedPeople) {
		People.update(selectedPerson._id, {
			$inc: {
				lunchScore: -(selectedPeople.length - 1)
			}
		})
		People.update({
			_id: {
				$in: _.pluck(_.reject(selectedPeople, function(person) {
					return person._id === selectedPerson._id;
				}), '_id')
			}
		}, {
			$inc: {
				lunchScore: 1
			}
		}, {
			multi: true
		});
		History.insert({
			paid: selectedPerson._id,
			people: selectedPeople.map(function (person) { return person._id; }),
			type: 'lunch',
			time: new Date()
		});
	},
	updateDinnerScores: function(selectedPerson, selectedPeople) {
		People.update(selectedPerson._id, {
			$inc: {
				dinnerScore: -(selectedPeople.length - 1)
			}
		})
		People.update({
			_id: {
				$in: _.pluck(_.reject(selectedPeople, function(person) {
					return person._id === selectedPerson._id;
				}), '_id')
			}
		}, {
			$inc: {
				dinnerScore: 1
			}
		}, {
			multi: true
		});
		History.insert({
			paid: selectedPerson,
			people: selectedPeople,
			type: 'dinner',
			time: new Date()
		});
	},
	resetLunch: function() {
		People.update({}, {
			$set: {
				lunchScore: 0
			}
		}, {
			multi: true
		});
	},
	resetDinner: function() {
		People.update({}, {
			$set: {
				dinnerScore: 0
			}
		}, {
			multi: true
		});
	}
});

if (Meteor.isServer) {
	Meteor.startup(function() {
		if (People.find().count() === 0) {
			People.remove({});
			[{
				name: 'Ben',
				lunchScore: 0,
				dinnerScore: 0
			}, {
				name: 'Greg',
				lunchScore: 0,
				dinnerScore: 0
			}, {
				name: 'Jake',
				lunchScore: 0,
				dinnerScore: 0
			}, {
				name: 'Ezra',
				lunchScore: 0,
				dinnerScore: 0
			}].forEach(function (person) {
				People.insert(person);
			});
		}
	});
}

Router.map(function() {
	this.route('home', {
		path: '/'
	});
	this.route('addPayment', {
		path: '/add'
	});
	this.route('history', {
		path: '/history'
	});
});