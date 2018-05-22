const ProjectModel = {
	ensureProject : function(obj) {
		obj = obj || {};
		return {
			id : obj.id || null,
			name : obj.name || null,
			description : obj.description || null,
			user : obj.user || null,
			created : obj.created || null,
			isPrivate : obj.isPrivate || true,
			queries : obj.queries || [],
			sessions : obj.sessions || []
		}
	},

	ensureProjectList : function(list) {
		list = list || [];
		return list.map(p => ProjectModel.ensureProject(p));
	},

	//TODO really bad implementation and never used. Finish & test later
	validateProject : function(obj) {
		return
			typeof(obj.id) == 'string' &&
			typeof(obj.name) == 'string' &&
			typeof(obj.description) == 'string' &&
			typeof(obj.user) == 'string' &&
			typeof(obj.created) == 'string' &&
			typeof(obj.isPrivate) == 'boolean' &&
			typeof(obj.queries) == 'object' &&
			typeof(obj.sessions) == 'object'
	}

}

export default ProjectModel;