import IDUtil from '../../../util/IDUtil';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Shows the collection form and handles saving the collection data using the given api.
 */
class CollectionForm extends React.PureComponent {
  /**
   * Handle form submit
   */
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

  /**
   * Save the collection using the Collection API
   *
   * @param  {object}   collection  Collection data
   * @param  {Function} callback Called when save is succesful
   */
  save(collection, callback) {
    this.props.api.save(this.props.user.id, collection, msg => {
      if (msg && msg.success) {
        let collectionId = collection.id;

        if (!collectionId) {
          // get collection id from message in case this is a new project
          // todo: ask api guys to return the id as a seperate field
          collectionId = msg.success.substring(msg.success.lastIndexOf(' ') + 1);
        }

        this.props.collectionDidSave(collectionId);
      } else {
        alert('An error occured while saving this collection');
      }
    });
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    return (
      <form
        className={IDUtil.cssClassName('collection-form')}
        onSubmit={this.handleSubmit.bind(this)}
      >
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={this.props.collection.name}
            ref={elem => (this.name = elem)}
          />

          <label className="label">Description</label>
          <textarea
            name="description"
            defaultValue={this.props.collection.description}
            ref={elem => (this.description = elem)}
          />

          <label className="label">Date created</label>
          <input
            type="date"
            name="dateCreated"
            defaultValue={this.props.collection.dateCreated}
            ref={elem => (this.dateCreated = elem)}
          />

          <label className="label">Creator</label>
          <input
            type="text"
            name="creator"
            defaultValue={this.props.collection.creator}
            ref={elem => (this.creator = elem)}
          />

          <input
            type="checkbox"
            name="private"
            defaultChecked={this.props.collection.isPrivate}
            id="project-private"
            ref={elem => (this.isPrivate = elem)}
          />

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
            value={this.props.submitButton}
          />
        </div>
      </form>
    );
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
