import IDUtil from '../../../util/IDUtil';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Shows the data entry form and handles saving the data entry using the given api.
*/
class DataEntryForm extends React.PureComponent {

    handleSubmit(e) {
        e.preventDefault();

        const dataEntry = Object.assign({}, this.props.dataEntry);
        dataEntry.title = this.title.value;
        dataEntry.descr = this.descr.value;
        dataEntry.dateCreated = this.dateCreated.value;
        dataEntry.creator = this.creator.value;
        dataEntry.fileUrl = this.fileUrl.value;
        dataEntry.id = this.props.dataEntry.id;
        this.save(dataEntry);

        return false;
    }


    //Save the data entry using the Collection API
    save(dataEntry, collectionId, callback) {
        this.props.api.saveEntry(this.props.user.id, this.props.collectionId, dataEntry, msg => {
            if (msg && msg.success) {
                if (!collectionId) {
                    // get collection id from message in case this is a new collection
                    // todo: ask api guys to return the id as a seperate field
                    collectionId = msg.success.substring(msg.success.lastIndexOf(' ') + 1);
                }
                this.props.dataEntryDidSave(msg);
            } else {
                alert('An error occured while saving this entry');
            }
        });
    }

    cancelEditing() {
        if(this.props.onCancelEditing) {
            this.props.onCancelEditing();
        }
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
                        defaultValue={this.props.dataEntry.title}
                        ref={elem => (this.title = elem)}/>
                    <label className="label">Description</label>
                    <textarea
                        name="description"
                        defaultValue={this.props.dataEntry.descr}
                        ref={elem => (this.descr = elem)}/>
                    <label className="label">Date created</label>
                    <input
                        type="date"
                        name="dateCreated"
                        defaultValue={this.props.dataEntry.dateCreated}
                        ref={elem => (this.dateCreated = elem)}/>
                    <label className="label">Creator</label>
                    <input
                        type="text"
                        name="creator"
                        defaultValue={this.props.dataEntry.creator}
                        ref={elem => (this.creator = elem)}/>
                    <label className="label">File URL</label>
                    <input
                        type="text"
                        name="fileUrl"
                        defaultValue={this.props.dataEntry.fileUrl}
                        id="fileUrl"
                        ref={elem => (this.fileUrl = elem)}/>
                </div>

                <div className="actions">
                    <a onClick={this.cancelEditing.bind(this)} className="btn">
                        Cancel
                    </a>
                    <input
                        type="submit"
                        className="btn primary add"
                        value={this.props.submitButton}/>
                </div>
            </form>
        )
    }
}

DataEntryForm.PropTypes = {
    submitButton: PropTypes.string.isRequired,
    cancelLink: PropTypes.string.isRequired,
    dataEntry: PropTypes.shape({
        title: PropTypes.string.isRequired,
        descr: PropTypes.string.isRequired
    }).isRequired,
    entryDidSave: PropTypes.func.isRequired,
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }),
    collectionId: PropTypes.string.isRequired,
    api: PropTypes.shape({
        saveEntry: PropTypes.func.isRequired
    })
};

export default DataEntryForm;
