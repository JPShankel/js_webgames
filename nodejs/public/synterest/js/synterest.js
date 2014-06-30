var app = {};

app.apiServer = "http://api.staging.cloud.syntertainment.com/api/0.1";

app.PlayerListModel = Backbone.Model.extend({
	initialize: function() {
		console.log('PlayerModelList Loaded');
	},
	url: app.apiServer+'/players'
});

app.PlayerListView = Backbone.View.extend({
	tagname: 'select',
	template: _.template($('#player-list-view').html()),
	initialize: function() {
	},
	render: function() {
		this.$el.empty();
		this.$el.append(this.template());
		$('#player-list-container').append(this.$el);
		return this;
	}
});

app.FrameListModel = Backbone.Model.extend({
	initialize: function() {
		console.log("FrameListModel loaded");
	},
	url: function() {
		return app.apiServer+'/players/'+this.id+'/temporals';
	}
});

app.FrameListView = Backbone.View.extend({
	tagname: 'select',
	template: _.template($("#player-frame-list-view").html()),
	initialize: function() {

	},
	render: function() {
		this.$el.empty();
		this.$el.append(this.template());
		console.log(this);
		$('#player-frame-list-container').empty();
		$('#player-frame-list-container').append(this.$el);
		return this;
	}
});

app.AppView = Backbone.View.extend({
	el:"#synterest-app",
	initialize: function() {
		this.input = this.$('#syntertainment-app');
		this.model = new app.PlayerListModel();
		this.model.fetch({
			success: function(col,resp) {
					app.frameListView = new app.PlayerListView({model:col});
					$('#player-list-container').append(app.frameListView.render().el);
			},
			error:function() {
				console.log('err');
			}
		});
	}
});

app.appView = new app.AppView();

function getPlayerName(p) {
	console.log(p);
	return p.username;
}

function getPlayerID(p) {
	return "'"+p.id+"'";
}

function selectPlayer(p) {
	app.frameList = new app.FrameListModel({id:p});
	
	app.frameList.fetch({
		success: function(col,resp) {
			var view = new app.FrameListView({model:col});
			$('#player-frame-list-container').append(view.render().el);
		},
		error:function() {
			console.log('err');
		}
	});

}

function selectFrame(f) {
	console.log(f);
}

function getFrameID(p) {
	return p._id;
}

