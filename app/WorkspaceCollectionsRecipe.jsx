import PersonalCollectionAPI from './api/PersonalCollectionAPI';
import CollectionListView from './components/workspace/personalcollections/CollectionListView';
import CollectionCreateView from './components/workspace/personalcollections/CollectionCreateView';
import CollectionEditView from './components/workspace/personalcollections/CollectionEditView';

//Import others

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
    Switch,
    BrowserRouter as Router,
    Route
} from 'react-router-dom'

class WorkspaceCollections extends Component {
    constructor(props){
        super(props);
        this.state={}
    }

    getPropsRenderer(RenderComponent, props, extraProps={}){
        return (routeProps) => (
            <RenderComponent {...routeProps} {...props} {...extraProps} />
        )
    }

    render() {
        return(
            <Router>
                <Switch>
                    <Route exact
                        path="/workspace/collections"
                        render={this.getPropsRenderer(CollectionListView, this.props, {api: PersonalCollectionAPI} )}/>
                    <Route exact
                        path="/workspace/collections/create"
                        render={this.getPropsRenderer(CollectionCreateView, this.props, {api: PersonalCollectionAPI} )}/>
                    <Route
                        path="/workspace/collections/:id"
                        render={this.getPropsRenderer(CollectionEditView, this.props, {api: PersonalCollectionAPI})}/>
                    <Route
                        path="/workspace/collections/:id/edit"
                        render={this.getPropsRenderer(CollectionEditView, this.props, {api: PersonalCollectionAPI})}/>
                </Switch>
            </Router>
        )
    }
}

WorkspaceCollections.propTypes = {

// collection api
api: PropTypes.shape({
    list: PropTypes.func.isRequired
}),

// current user object used for defining access roles per project
user: PropTypes.shape({
    id: PropTypes.string.isRequired
}).isRequired,
};

export default WorkspaceCollections;
