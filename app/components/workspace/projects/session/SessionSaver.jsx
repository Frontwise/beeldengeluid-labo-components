import AnnotationUtil from '../../../../util/AnnotationUtil';
import IDUtil from '../../../../util/IDUtil';
import AnnotationAPI from '../../../../api/AnnotationAPI';


class SessionSaver extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bookmarks : []
    }
  }

  componentDidMount() {
    let filter = {
      'user.keyword' : this.props.user.id,
      'project' : this.props.project.id,
      'motivation' : 'bookmarking'
    }
    AnnotationAPI.getFilteredAnnotations(
      filter,
      this.onLoadBookmarkAnnotations.bind(this)
    );
  }

  onLoadBookmarkAnnotations(data) {
    this.setState({bookmarks : data.annotations || []});
  }

  submitNewBookmark(e) {
    e.preventDefault();
    let annotation = AnnotationUtil.generateEmptyW3CMultiTargetAnnotation(
      this.props.user,
      this.props.project,
      [] //empty target
    )
    annotation.body = [{
      "annotationType": "classification",
      "vocabulary": "clariahwp5-bookmark-group",
      "label": this.bookmarkCategory.value,
      "user": this.props.user.id
    }]
    this.onOutput(annotation);
  }

  //communicate back a multi-target annotation with a classification body
  onOutput(annotation) {
    if(this.props.onOutput) {
      this.props.onOutput(this.constructor.name, annotation);
    }
  }

  render() {
    let bookmarkList = null;
    if(this.state.bookmarks.length > 0) {
      //TODO which part of the body is the name of the bookmark group?
      const options = this.state.bookmarks.map((b, index) => {
        return (<a className="list-group-item" href="#" key={'an__' + index} onClick={this.onOutput.bind(this, b)}>
          {b.body[0].label}
        </a>)
      });
      bookmarkList = (
        <div className="list-group">
          {options}
        </div>
      )
    }
    return (
      <div className={IDUtil.cssClassName('bookmark-selector')}>
        <br/>
        <div className="row">
          <div className="col-md-12">
            {bookmarkList}
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <form>
              <div className="form-group">
                <h4>Bookmark category</h4>
                <input
                    ref={input => (this.bookmarkCategory = input)}
                  type="text"
                  className="form-control"
                />
                <br/>
                <button className="btn btn-primary" onClick={this.submitNewBookmark.bind(this)}>Use</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }
}

export default SessionSaver;
