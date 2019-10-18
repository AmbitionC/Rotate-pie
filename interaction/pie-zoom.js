/*
 * author: Hao Chen
 * description: zoom the data-intensive area
 */

const Util = require('../util/common');
const Interaction = require('./base');
const Chart = require('../chart/chart');

class PieZoom extends Interaction {
    // 获取基本配置参数
    getDefaultCfg() {
        let defaultCfg = super.getDefaultCfg();
        defaultCfg = Util.mix({}, defaultCfg, {
            // 默认设置
            startEvent: 'tap',
            processEvent: null,
            animate: false,
            zoomFunction: false,
        });
        // 微信&小程序适配
        if (Util.isWx || Util.isMy) {
            defaultCfg.startEvent = 'touchstart';
            defaultCfg.endEvent = 'touchend';
        }
        return defaultCfg;
    }

    constructor(cfg, chart) {
        super(cfg, chart);
        let animating = false;
        const self = this;
    }

    // 重新绘制图表
    _repaintChart(angle) {
        const chartCoord = this.chart.get('coord');
        const coordStart = chartCoord.startAngle + angle;
        const coordEnd = chartCoord.endAngle + angle;
        this.chart.animate(false);
        this.chart.coord('polar', {
            transposed: true,
            radius: 0.8,
            startAngle: coordStart,
            endAngle: coordEnd
        });
        this.chart.repaint();
    }

    // 改变底部的Legend
    _changeLegend(tapShape) {
        let targetShape = tapShape;
        const legend = this.chart.get('legendController').legends.bottom[0];
        legend.items[0].name = targetShape.get('origin')._origin.name;
        legend.items[0].value = targetShape.get('origin')._origin.proportion;
        let legendMarkerStyle = {
            symbol: 'square',
            fill: targetShape.get('origin').color,
            radius: 4
        }
        legend.items[0].marker = legendMarkerStyle;
    }

    // 获取点击的元素，以及指腹覆盖的范围
    _getTapShapeByData(data) {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const children = container.get('children');
        let selectedShape = null;
        Util.each(children, child => {
            if (child.get('isShape') && (child.get('className') === geom.get('type'))) {
                const shapeData = child.get('origin')._origin;
                if (Util.isObjectValueEqual(shapeData, data)) {
                    selectedShape = child;
                    return false;
                }
            }
        });
        return selectedShape;
    }

    _getTapShapes(e) {
        const chart = this.chart;
        if (e.type === 'tap') {
            e.clientX = e.center.x;
            e.clientY = e.center.y;
        };
        const { x, y } = Util.createEvent(e, chart);
        const records = chart.getSnapRecords({ x, y });
        if (!records.length) return;
        const data = records[0]._origin;
        const tapShape = this._getTapShapeByData(data);
        return tapShape;
    }

    // 根据点击的元素，旋转到底部
    _slideToMiddle(angle, animateConfig) {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const center = this.chart.get('coord').center;
        let angleFromBottom = Math.PI / 2 - angle;
        let diff = function(t) {
            return angleFromBottom * t
        };
        if (angleFromBottom !== 0) {
            container.animate().to(animateConfig).onFrame((t) => {
                this.animating = true;
                let frameAngle = diff(t);
                container.setTransform([
                    ['t', center.x, center.y],
                    ['r', frameAngle],
                    ['t', -center.x, -center.y]
                ]);
                if (t === 1) {
                    this.animating = false;
                    this._repaintChart(angleFromBottom);
                }
            })
        }
    } 

    _rotateTapShapeToBottom(tapShape) { 
        const startAngle = tapShape.attr('startAngle');
        const endAngle = tapShape.attr('endAngle');
        let middleAngle = (startAngle + endAngle) / 2;
        if (startAngle > endAngle && endAngle <= 0) {
            middleAngle = (Math.PI * 2 - Math.abs(startAngle - endAngle)) / 2 + startAngle;
            if (middleAngle > 1.5 * Math.PI) {
                middleAngle = middleAngle - 2 * Math.PI;
            }
        }
        this._slideToMiddle(middleAngle, {
            duration: 350,
            easing: 'backOut'
        });
        this._changeLegend(tapShape);
    }

    // 根据点击的位置，计算周边数据密集区的大小
    _createRandomPoints(range) {  // 产生点击区域周围range范围的随机点
        return Math.floor(Math.random() * (Math.random() > 0.5 ? 1 : -1) * range)
    }

    _getTapAreaShapes(e) {

    } 

    start(ev) {
        const tapShape = this._getTapShapes(ev);
        if (!this.zoomFunction) {
            // 不开启数据密集区放大功能
            this._rotateTapShapeToBottom(tapShape);
        }else {
            // 开启数据密集区放大功能

            // 将数据
        }
    }
}

Chart.registerInteraction('pie-zoom', PieZoom);
module.exports = PieZoom;
