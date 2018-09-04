import IDUtil from '../../../util/IDUtil';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';


class CollectionForm extends React.PureComponent {

    handleSubmit(e) {
        e.preventDefault();

        const collection = Object.assign({}, this.props.collection);
        collection.name = this.name.value;
        collection.description = this.description.value;
        collection.dateCreated = this.dateCreated.value;
        collection.creator = this.creator.value;
        collection.isPrivate = this.isPrivate.checked;
        this.save(collection);

        return false;
    }


    //Save the collection using the Collection API
    save(collection, callback) {
        this.props.api.save(this.props.user.id, collection, c => {
            if (c && c.id) {
                this.props.collectionDidSave(c.id);
            } else {
                alert('An error occured while saving this collection');
            }
        });
    }

    render() {
        return (
            <form className={IDUtil.cssClassName('collection-form')}
                onSubmit={this.handleSubmit.bind(this)}>
                <div>
                    <label className="label">Name</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={this.props.collection.name}
                        ref={elem => (this.name = elem)}/>
                    <label className="label">Description</label>
                    <textarea
                        name="description"
                        defaultValue={this.props.collection.description}
                        ref={elem => (this.description = elem)}/>
                    <label className="label">Date created</label>
                    <input
                        type="date"
                        name="dateCreated"
                        defaultValue={this.props.collection.dateCreated}
                        ref={elem => (this.dateCreated = elem)}/>
                    <label className="label">Creator</label>
                    <input
                        type="text"
                        name="creator"
                        defaultValue={this.props.collection.creator}
                        ref={elem => (this.creator = elem)}/>
                    <input
                        type="checkbox"
                        name="private"
                        defaultChecked={this.props.collection.isPrivate}
                        id="project-private"
                        ref={elem => (this.isPrivate = elem)}/>

                    <label htmlFor="collection-private">
                        This is a private collection that is only visible to you and your
                        collaborators
                    </label>
                </div>

                <div className="actions">
                    <Link to={this.props.cancelLink} className="btn">
                        Cancel
                    </Link>
                    <input
                        type="submit"
                        className="btn primary add"
                        value={this.props.submitButton}/>
                </div>
            </form>
        )
    }
}

CollectionForm.PropTypes = {
    submitButton: PropTypes.string.isRequired,
    cancelLink: PropTypes.string.isRequired,
    collection: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        private: PropTypes.bool.isRequired
    }).isRequired,
    collectionDidSave: PropTypes.func.isRequired,
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }),
    api: PropTypes.shape({
        save: PropTypes.func.isRequired
    })
};

export default CollectionForm;
