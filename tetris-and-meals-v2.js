People = new Meteor.Collection('people');

if (Meteor.isClient) {
	Template.list.people = function() {
		return People.find();
	};
	Template.list.time = function() {
		return moment().format('hh:mm A');
	}
	Session.set('selectedPeople', []);
	Template.person.selected = function() {
		var selectedPeople = Session.get('selectedPeople');
		return _.contains(selectedPeople, this._id)? 'selected' : '';
	};

	Template.person.events({
		'click': function() {
			var selectedPeople = Session.get('selectedPeople');
			var selectedPersonId = this._id;
			if (_.contains(selectedPeople, selectedPersonId))
				Session.set('selectedPeople', _.reject(selectedPeople, function(id) { return id === selectedPersonId; }))
			else
				Session.set('selectedPeople', selectedPeople.concat(this._id))
		}
	});

	Template.actions.peopleSelected = function() {
		return Session.get('selectedPeople').length > 1;
	};

	Template.actions.events({
		'click button': function() {
			var selectedPeople = Session.get('selectedPeople');
			var itIsLunch = moment().isBefore(moment('2:30 PM', 'h:mm A'));
			var selectedPerson;
			if (itIsLunch) {
				selectedPerson = People.findOne({_id: {$in: selectedPeople}}, {sort: {lunchScore: -1}});
				Meteor.call('updateLunchScores', selectedPerson, selectedPeople);
			} else {
				selectedPerson = People.findOne({_id: {$in: selectedPeople}}, {sort: {dinnerScore: -1}});
				Meteor.call('updateDinnerScores', selectedPerson, selectedPeople);
			}
			alert(selectedPerson.name);
			Session.set('selectedPeople', []);
		}
	});
}

Meteor.methods({
	updateLunchScores: function(selectedPerson, selectedPeople) {
		People.update(selectedPerson._id, {$inc: {lunchScore: -(selectedPeople.length - 1)}})
		People.update({_id: {$in: _.reject(selectedPeople, function(id) { return id === selectedPerson._id; })}}, {$inc: {lunchScore: 1}}, {multi: true});
	},
	updateDinnerScores: function(selectedPerson, selectedPeople) {
		People.update(selectedPerson._id, {$inc: {dinnerScore: -(selectedPeople.length - 1)}})
		People.update({_id: {$in: _.reject(selectedPeople, function(id) { return id === selectedPerson._id; })}}, {$inc: {dinnerScore: 1}}, {multi: true});
	},
	resetLunch: function() {
		People.update({}, {$set: {lunchScore: 0}}, {multi: true});
	}
});

if (Meteor.isServer) {
	Meteor.startup(function () {
		if (People.find().count() === 0) {
			People.remove({});
			People.insert({ name: 'Ben', lunchScore: 0, dinnerScore: 0 });
		}
	});
}
