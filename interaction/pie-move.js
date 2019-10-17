/*
 * author: Hao Chen
 * description: user rotate the pie, pie move with gesture
 */

const Util = require('../util/common');
const Interaction = require('./base');
const Chart = require('../chart/chart');

class PieMove extends Interaction {
    // 获取基本配置参数
    getDefaultCfg() {
        let defaultCfg = super.getDefaultCfg();
        defaultCfg = Util.mix({}, defaultCfg, {
            // 默认设置
            startEvent: 'panstart',
            processEvent: 'panmove',
            endEvent: 'panend',
            animate: false,
        });
        // 微信&小程序适配
        if (Util.isWx || Util.isMy) {
            defaultCfg.startEvent = 'touchstart';
            defaultCfg.processEvent = 'touchmove';
            defaultCfg.endEvent = 'touchend';
        }
        return defaultCfg;
    }

    constructor(cfg, chart) {
        super(cfg, chart);
        let lastMouseAngle, diffAngle;
        let animating = false;
    }

    // 获取基本参数
    _getChartParam() {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const center = this.chart.get('coord').center; 
        return [container, center]
    }
   
    // 重新绘制图表
    _repaintChart(angle) {
        let chartCoord = this.chart.get('coord');
        let coordStart = chartCoord.startAngle + angle;
        let coordEnd = chartCoord.endAngle + angle;
        this.chart.animate(false);
        this.chart.coord('polar', {
            transposed: true,
            radius: 0.8,
            startAngle: coordStart,
            endAngle: coordEnd
        });
        this.chart.repaint();
    }

    // 根据用户手势触发位置，转化为极坐标中的角度
    _fromPointToAngle(e) {
        let currentPoint = e.center;
        let center = this._getChartParam()[1];
        let currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x) + Math.PI;
        return currentAngle;
    }

    // 获得箭头指向的元素
    _getBottomShape() {
        let container = this._getChartParam()[0];
        let pieShapes = container.get('children');
        let middleAngle, bottomShape;
        Util.each(pieShapes, function(s) {
            let startAngle = s.attr('startAngle');
            let endAngle = s.attr('endAngle');
            // 找到底部的元素
            if (startAngle <= Math.PI * 0.5 && endAngle >= Math.PI * 0.5) {
                bottomShape = s;
                middleAngle = (startAngle + endAngle) / 2;
            }
        })
        return [middleAngle, bottomShape]
    }

    // 改变底部的Legend
    _changeLegend() {
        let targetShape = this._getBottomShape()[1];
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

    // 完成滑动操作后，根据最后时刻的diffAngle决定最后滑动效果
    _interpolateNumber(a) {
        return function(t) {
            return a * t
        }
    }

    // 根据最后一次的变化角度，计算持续时长
    _handleDuration(angle) {
        let duration = Math.abs(Math.floor(1600 * angle));
        duration = duration > 2000 ? 2000 : duration;
        duration = duration < 100 ? 100 : duration;
        return duration
    }

    _slideToMiddle(angle, animateConfig) {
        let angleFromBottom = Math.PI / 2 - angle;
        let diff = this._interpolateNumber(angleFromBottom);
        let [container, center] = this._getChartParam();
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

    _slideAnimation(lastDiffAngle) {
        let diff = this._interpolateNumber(lastDiffAngle);
        let [container, center] = this._getChartParam();
        
        container.animate().to({
            duration: this._handleDuration(lastDiffAngle),
            easing: 'cubicOut'
        }).onFrame((t) => {
            this.animating = true;
            let frameAngle = diff(t);
            container.setTransform([
                ['t', center.x, center.y],
                ['r', frameAngle],
                ['t', -center.x, -center.y]    
            ]);
            if (t === 1) {
                this.animating = false;
                this._repaintChart(frameAngle);
                this._changeLegend();
            }
        }).onEnd(() => {
            let middleAngle = this._getBottomShape()[0];
            this._slideToMiddle(middleAngle, {
                duration: 850,
                easing: 'backOut'
            })
        });
    }

    start(ev) {
        this.lastMouseAngle = this._fromPointToAngle(ev);
    }

    process(ev) {
        let newMouseAngle = this._fromPointToAngle(ev);
        this.diffAngle = newMouseAngle - this.lastMouseAngle;
        // 更新上一次移动的角度为本次移动起始的角度
        this.lastMouseAngle = newMouseAngle;
        this._repaintChart(this.diffAngle);
        this._changeLegend();
    }

    end(ev) {
        this._slideAnimation(this.diffAngle * 10);
    }
}

Chart.registerInteraction('pie-move', PieMove);
module.exports = PieMove;