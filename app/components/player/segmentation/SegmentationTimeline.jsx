import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';


class SegmentationTimeline extends React.Component {

	constructor(props) {
		super(props);
	}

	componentDidMount() {
	    window.addEventListener('resize', this.updateCanvasDimensions.bind(this));
	    this.updateCanvasDimensions();
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateCanvasDimensions.bind(this));
	}

	updateCanvasDimensions() {
		const c = document.getElementById('timebar_canvas__' + this.props.mediaObject.id);
		const container = document.getElementById('timebar__' + this.props.mediaObject.id);
		if(container) {
			c.width = container.offsetWidth;
			c.height = container.offsetHeight;
		}
	}

	seek(event) {
		const c = document.getElementById("timebar_canvas__" + this.props.mediaObject.id);
		const mousePos = this.getMousePos(c, event);
        const pos = this.props.duration / 100 * (mousePos.x / (c.width / 100));
        FlexPlayerUtil.seekRelativeToOnAir(this.props.playerAPI, pos, this.props.mediaObject)
		this.updateCanvasDimensions();
	}

	componentDidUpdate() {
		const c = document.getElementById("timebar_canvas__" + this.props.mediaObject.id);
		if(c.width == 0 && c.height == 0) {
			this.updateCanvasDimensions();
		}
		let t = this.props.curPosition;
        if(!t) {
            t = this.props.start;
        }
        const formattedTime = TimeUtil.formatTime(t);
        const elapsed = c.width / 100 * (t / (this.props.duration / 100));
        const startPoint = c.width / 100 * (this.props.start / (this.props.duration / 100));
        const endPoint = c.width / 100 * (this.props.end / (this.props.duration / 100));
        const ctx = c.getContext("2d");
        ctx.clearRect (0, 0, c.width, c.height);
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(0,0, elapsed, c.height / 3);//time progressing
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(startPoint, 0, 3, c.height);//time progressing
        ctx.fillStyle = "#FFFF00";
        ctx.fillRect(endPoint, 0, 3, c.height);//time progressing
        ctx.font = "20px Verdana";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(formattedTime, 10, c.height - 5);
	}

	getMousePos(canvas, evt) {
	    const rect = canvas.getBoundingClientRect();
	    return {
	      x: evt.clientX - rect.left,
	      y: evt.clientY - rect.top
	    };
	}

	render() {
		return (
			<div id={'timebar__' + this.props.mediaObject.id} className={IDUtil.cssClassName('segmentation-timeline')}>
				<canvas id={'timebar_canvas__' + this.props.mediaObject.id} width="300" height="50"
					onClick={this.seek.bind(this)}>
				</canvas>
			</div>
		)
	}
}

export default SegmentationTimeline;