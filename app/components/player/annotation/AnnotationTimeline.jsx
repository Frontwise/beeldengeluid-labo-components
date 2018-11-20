import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';
import AnnotationUtil from '../../../util/AnnotationUtil';
import AnnotationActions from '../../../flux/AnnotationActions';

/*
Important notes:
	input: the annotations are always passed by a owning component. There is no direct link with the AnnotationStore

	output: selected annotation


TODO:
	- add hover over thing for showing extra info per annotation
	- implement annotation layers (utilize, this.props.annotationLayers)
*/

class AnnotationTimeline extends React.Component {

	constructor(props) {
		super(props);
		this.hoverPos = -1;
		this.repainting = false;

		this.start = -1;
		this.end = -1;
	}

	/* ----------------------- FOR RENDERING THE CANVAS PROPERLY -----------------------*/

	componentDidMount() {
		//make sure the canvas is resized properly whenever the window is resized
	    window.addEventListener('resize', this.updateCanvasDimensions.bind(this));
	    this.updateCanvasDimensions();

	    //add a mouse move listener to the canvas, so it's possible to highlight annotations hovered over
	    const c = document.getElementById("an_timebar_canvas__" + this.props.mediaObject.id);
	    c.addEventListener('mousemove', this.highlightAnnotation.bind(this));
	}

	//TODO
	componentWillUnmount() {
		window.removeEventListener('resize', this.updateCanvasDimensions.bind(this));
	}

	updateCanvasDimensions() {
		const c = document.getElementById('an_timebar_canvas__' + this.props.mediaObject.id);
		const container = document.getElementById('an_timebar__' + this.props.mediaObject.id);
		c.width = container.offsetWidth;
		c.height = container.offsetHeight;
	}

	//TODO make sure this thing repaints 'enough'
	componentDidUpdate() {
		this.repaint();
	}

	/* ----------------------- FOR ACCESSING THE ANNOTATIONS -----------------------*/

	//only applies to segment/fragment annotations!!! TODO check a bit more gracefully
	determineCurrentAnnotation() {
		let currentAnnotation = null;
		if(this.props.annotations) {
			const pos = this.props.curPosition;
			currentAnnotation = this.props.annotations.filter((a, index)=> {
			    if(a.target){
				    if(a.target.selector && a.target.selector.refinedBy) {
					    if(a.target.selector.refinedBy.start < pos && a.target.selector.refinedBy.end > pos) {
						    return true;
					    }
				    }
				}
			})
		}
		return currentAnnotation;
	}

	//TODO update the active annotation after pressing play
	activateAnnotation(e) {
		const activePos = parseFloat(this.hoverPos);
		const currentAnnotation = this.props.annotations.filter((a, index)=> {
			if(a.target.selector && a.target.selector.refinedBy) {
				if(a.target.selector.refinedBy.start < activePos && a.target.selector.refinedBy.end > activePos) {
					return true;
				}
			}
		})
		if(currentAnnotation.length == 1) {
			AnnotationActions.play(currentAnnotation[0]);
		}
	}

	editAnnotation() {
		const currentAnnotation = this.props.annotations.filter((a, index)=> {
			if(a.target.selector && a.target.selector.refinedBy) {
				if(a.target.selector.refinedBy.start < this.hoverPos && a.target.selector.refinedBy.end > this.hoverPos) {
					return true;
				}
			}
		})
		if(currentAnnotation.length == 1) {
			AnnotationActions.edit(currentAnnotation[0]);
		}
	}

	highlightAnnotation(e) {
		const c = document.getElementById("an_timebar_canvas__" + this.props.mediaObject.id);
		const mousePos = this.getMousePos(c, e);
		const dur = this.props.duration;
		this.hoverPos = dur / 100 * (mousePos.x / (c.width / 100));
		if(this.props.playerAPI.isPaused((paused) => {
			if(paused) {
				this.repaint();
			}
		}));
	}

	/* ----------------------- FOR DRAWING THE CANVAS ----------------------- */

	repaint() {
		if(this.repainting) {
			return;
		}
		this.repainting = true;
		const c = document.getElementById("an_timebar_canvas__" + this.props.mediaObject.id);
		if(c.width == 0 && c.height == 0) {
			this.updateCanvasDimensions();
		}
		let dur = -1;
		let t = this.props.curPosition;
        if(!t) {
            t = this.props.start;
        }
		if(this.props.fragmentMode === false) {
	        dur = this.props.duration;
	        var ctx = c.getContext("2d");
	        ctx.clearRect (0, 0, c.width, c.height);
	        if(this.props.annotations) {
		        this.props.annotations.forEach((a, index) => {
		        	if(a.target) {
		        		const frag = AnnotationUtil.extractTemporalFragmentFromAnnotation(a.target);
			        	if(frag) {
				        	const start = c.width / 100 * (frag.start / (dur / 100));
				        	const end = c.width / 100 * (frag.end / (dur / 100));
				        	if(this.hoverPos >= frag.start && this.hoverPos <= frag.end) {
				        		ctx.fillStyle = "#FF69B4";
				        	} else if(this.props.annotation && a.id == this.props.annotation.id){
				        		ctx.fillStyle = "lime";
				        	} else {
				        		ctx.fillStyle = "#00bfff";
				        	}
				        	ctx.fillRect(start, 0, end - start, c.height / 2);//time progressing
				        }
				    }
		        });
		    }
	    } else {
			dur = this.props.end - this.props.start;
			const dt = t - this.props.start;
			var ctx = c.getContext("2d");
			ctx.clearRect (0, 0, c.width, c.height);
			console.debug('TODO: implement this');
        }
        this.repainting = false;
	}

	getMousePos(canvas, evt) {
	    const rect = canvas.getBoundingClientRect();
	    return {
	      x: evt.clientX - rect.left,
	      y: evt.clientY - rect.top
	    };
	}

	render() {
		let currentAnnotation = this.determineCurrentAnnotation();
		//this depends on the format of the annotation and should be harmonized in the back-end
		if(currentAnnotation && currentAnnotation.length && currentAnnotation.length == 1) {
			currentAnnotation = currentAnnotation[0].words;
		}
		return (
			<div id={'an_timebar__' + this.props.mediaObject.id} className={IDUtil.cssClassName('annotation-timeline')}>
				<canvas id={'an_timebar_canvas__' + this.props.mediaObject.id} width="300" height="50"
					onClick={this.activateAnnotation.bind(this)}
					onDoubleClick={this.editAnnotation.bind(this)}>
				</canvas>
			</div>
		)
	}

}

export default AnnotationTimeline;
