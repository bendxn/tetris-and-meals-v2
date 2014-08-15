People = new Meteor.Collection('people');

if (Meteor.isClient) {
	Template.list.people = function() {
		return People.find();
	};
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
		return Session.get('selectedPeople').length > 0;
	};

	Template.actions.events({
		'click button': function() {
			var selectedPeople = Session.get('selectedPeople');
			var itIsLunch = new Date().getHours() < 14;
			var selectedPerson;
			if (itIsLunch)
				selectedPerson = People.findOne({_id: {$in: selectedPeople}}, {sort: {lunchScore: -1}});
			else
				selectedPerson = People.findOne({_id: {$in: selectedPeople}}, {sort: {dinnerScore: -1}});
			alert(selectedPerson.name);
		}
	});
}

if (Meteor.isServer) {
	Meteor.startup(function () {
		if (People.find().count() === 0) {
			People.remove({});
			People.insert({ name: 'Ben', lunchScore: 0, dinnerScore: 0 });
		}
	});
}
