import { Coordinates } from './Coordinates';
import { DrawChart } from './DrawChart';

export class Drawing {
    id: string;
    canvasWrapEl: HTMLDivElement;
    canvEl: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    coordsInstance: Coordinates;
    type: 'trends' | 'levels';
    maxPointsCount: number;
    points: {
        pointId: number;
        coords: {
            x: number;
            y: number;
        },
        highlight?: boolean
    }[] = [];
    sendFn: (opt: any) => any;
    mC: (e: any) => void;
    mM: (e: any) => void;
    kD: (e: any) => void;
    moving: boolean = false;

    constructor({id, canvasWrapEl, coordsInstance, canvasWidth, canvasHeight, type, sendFn }: {
        id: string;
        canvasWrapEl: HTMLDivElement;
        coordsInstance: Coordinates;
        canvasWidth: number;
        canvasHeight: number;
        type: 'trends' | 'levels';
        sendFn: (opt: any) => any;
    }) {
        this.sendFn = sendFn;
        this.id = id;
        this.type = type;

        if (this.type == 'trends') {
            this.maxPointsCount = 4;
        } else if (this.type == 'levels') {
            this.maxPointsCount = 2;
        }

        this.coordsInstance = coordsInstance;

        this.canvasWrapEl = canvasWrapEl;

        this.canvEl = document.createElement('canvas');
        this.canvasWrapEl.appendChild(this.canvEl);

        this.canvasWrapEl.style.width = canvasWidth + 'px';
        this.canvasWrapEl.style.height = canvasHeight + 'px';

        this.canvEl.width = canvasWidth;
        this.canvEl.height = canvasHeight;

        this.ctx = this.canvEl.getContext('2d');

        this.mouseEvents();
    }

    mouseEvents() {
        const mouseCoords = (e: MouseEvent): { x: number; y: number; } => {
            const rect = this.canvasWrapEl.getBoundingClientRect();

            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }

        this.mC = e => {
            const { x, y } = mouseCoords(e);

            if (this.type == 'trends') {
                if (this.points.length < this.maxPointsCount) {
                    this.setPoint({ pointId: this.points.length, x, y });

                    if (this.points.length == 2) {
                        for (const point of this.points) {
                            this.setPoint({
                                pointId: this.points.length,
                                x: point.coords.x,
                                y: point.coords.y - 25
                            });
                        }

                        this.moving = true;
                    }

                } else {
                    for (const point of this.points) {
                        const { x: pX, y: pY } = point.coords;

                        if (pX - 7 < x && x < pX + 7 && pY - 7 < y && y < pY + 7) {
                            this.setPoint({ pointId: point.pointId, highlight: !point.highlight });
                            this.moving = true;
                        }
                    }
                }

            } else if (this.type == 'levels') {
                if (this.points.length < this.maxPointsCount) {
                    this.setPoint({ pointId: this.points.length, x, y });
                    this.setPoint({ pointId: this.points.length, x, y: y - 25 });
                    this.moving = true;

                } else {
                    for (const point of this.points) {
                        const { x: pX, y: pY } = point.coords;

                        if (pY - 7 < y && y < pY + 7) {
                            this.setPoint({ pointId: point.pointId, highlight: !point.highlight });
                            this.moving = true;
                        }
                    }
                }
            }

            let isHighlight = 0;

            for (const point of this.points) {
                if (point.highlight) {
                    isHighlight++;
                }
            }

            if (isHighlight === 0 && this.points.length == this.maxPointsCount && this.moving) {
                this.moving = false;
                this.sendPointsData();
            }

        }

        this.mM = e => {
            const { x, y } = mouseCoords(e);

            if (this.type == 'trends') {
                for (const point of this.points) {
                    if (point.highlight) {

                        if (point.pointId < 2) {
                            this.setPoint({
                                pointId: point.pointId + 2,
                                x: this.points[point.pointId + 2].coords.x + (x - point.coords.x),
                                y: this.points[point.pointId + 2].coords.y + (y - point.coords.y)
                            });
                        } else {
                            if (point.pointId == 2) {
                                this.setPoint({
                                    pointId: 3,
                                    x: this.points[3].coords.x + (x - point.coords.x),
                                    y: this.points[3].coords.y + (y - point.coords.y)
                                });
                            } else {
                                this.setPoint({
                                    pointId: 2,
                                    x: this.points[2].coords.x + (x - point.coords.x),
                                    y: this.points[2].coords.y + (y - point.coords.y)
                                });
                            }
                        }

                        this.setPoint({ pointId: point.pointId, highlight: true, x, y });

                    }
                }

            } else if (this.type == 'levels') {
                for (const point of this.points) {
                    if (point.highlight) {
                        if (point.pointId == 0) {
                            this.setPoint({
                                pointId: 1,
                                x,
                                y: this.points[1].coords.y + (y - point.coords.y)
                            });
                        }

                        this.setPoint({ pointId: point.pointId, highlight: true, x, y });
                    }
                }
            }

        }

        this.kD = e => {
            if (e.key == 'Delete') {
                for (const point of this.points) {
                    if (point.highlight == true && this.moving) {
                        this.sendPointsData('delete');
                    }
                }
            }
        }

        this.canvasWrapEl.addEventListener('click', this.mC);
        this.canvasWrapEl.addEventListener('mousemove', this.mM);
        document.addEventListener('keydown', this.kD);
    }

    setPoint(opt: {
        pointId: number;
        x?: number;
        y?: number;
        highlight?: boolean;
    }) {
        if (this.points.length < this.maxPointsCount) {
            this.points.push({
                pointId: opt.pointId,
                coords: {
                    x: Math.round(opt.x),
                    y: Math.round(opt.y)
                }
            });

        } else {
            for (const point of this.points) {
                if (point.pointId == opt.pointId) {
                    point.highlight = opt.highlight !== undefined ? opt.highlight : point.highlight;
                    point.coords.x = opt.x !== undefined ? Math.round(opt.x) : point.coords.x;
                    point.coords.y = opt.y !== undefined ? Math.round(opt.y) : point.coords.y;
                }
            }
        }

        this.drawScene();
    }

    drawScene() {
        this.ctx.clearRect(0, 0, this.canvEl.width, this.canvEl.height);

        if (this.points.length == this.maxPointsCount) {
            if (this.type == 'trends') {
                this.ctx.fillStyle = 'rgba(255,180,242,.35)';
                this.ctx.beginPath();
                this.ctx.moveTo(this.points[0].coords.x, this.points[0].coords.y);
                this.ctx.lineTo(this.points[1].coords.x, this.points[1].coords.y);
                this.ctx.lineTo(this.points[3].coords.x, this.points[3].coords.y);
                this.ctx.lineTo(this.points[2].coords.x, this.points[2].coords.y);
                this.ctx.closePath();
                this.ctx.fill();


                this.ctx.strokeStyle = "#ff6800";

                this.ctx.beginPath();
                this.ctx.moveTo(this.points[0].coords.x, this.points[0].coords.y);
                this.ctx.lineTo(this.points[1].coords.x, this.points[1].coords.y);
                this.ctx.stroke();

                this.ctx.strokeStyle = "#c3a0bd";

                this.ctx.beginPath();
                this.ctx.moveTo(this.points[2].coords.x, this.points[2].coords.y);
                this.ctx.lineTo(this.points[3].coords.x, this.points[3].coords.y);
                this.ctx.stroke();

            } else if (this.type == 'levels') {
                this.ctx.fillStyle = 'rgba(255,180,242,.35)';
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.points[0].coords.y);
                this.ctx.lineTo(this.canvEl.width, this.points[0].coords.y);
                this.ctx.lineTo(this.canvEl.width, this.points[1].coords.y);
                this.ctx.lineTo(0, this.points[1].coords.y);
                this.ctx.closePath();
                this.ctx.fill();

                for (const point of this.points) {
                    this.ctx.strokeStyle = point.highlight ? '#35ff00' : (point.pointId == 1 ? '#c3a0bd' : '#ff6800');
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, point.coords.y + .5);
                    this.ctx.lineTo(this.canvEl.width, point.coords.y + .5);
                    this.ctx.stroke();
                }

            }
        }

        if (this.type == 'trends') {
            for (const point of this.points) {
                this.ctx.fillStyle = point.highlight ? '#35ff00' : (point.pointId > 1 ? '#c3a0bd' : '#ff6800');
                this.ctx.beginPath();
                this.ctx.arc(point.coords.x, point.coords.y, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }

        } else if (this.type == 'levels') {
            for (const point of this.points) {
                this.ctx.fillStyle = point.highlight ? '#35ff00' : '#ff6800';
                this.ctx.beginPath();
                this.ctx.arc(point.coords.x, point.coords.y, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    sendPointsData(opt?: string) {
        if (opt == 'delete') {
            const sendData = {
                removeId: this.id
            };

            this.sendFn(sendData);

        } else if (this.type == 'levels') {
            const sendData = {
                obj: {
                    id: this.id,
                    type: this.type,
                    price: []
                }
            };

            for (const point of this.points) {
                const props = this.coordsInstance.getProps(point.coords.x, point.coords.y);
                sendData.obj.price.push(props.price);
            }

            this.sendFn(sendData);

        } else if (this.type == 'trends') {
            const sendData = {
                obj: {
                    id: this.id,
                    type: this.type,
                    lines: []
                }
            };

            sendData.obj.lines.push({
                start: this.coordsInstance.getProps(this.points[0].coords.x, this.points[0].coords.y),
                end: this.coordsInstance.getProps(this.points[1].coords.x, this.points[1].coords.y)
            });

            sendData.obj.lines.push({
                start: this.coordsInstance.getProps(this.points[2].coords.x, this.points[2].coords.y),
                end: this.coordsInstance.getProps(this.points[3].coords.x, this.points[3].coords.y)
            });

            this.sendFn(sendData);
        }
    }

    drawWithData(input: any) {
        if (this.type == 'levels') {
            const inp: {
                id: string;
                price: number[];
            } = input;

            for (const price of inp.price) {
                const { x, y } = this.coordsInstance.getCoordinates(price);

                this.setPoint({ pointId: this.points.length, x, y });
            }

        } else if (this.type == 'trends') {
            const inp: {
                id: string;
                lines: {
                    start: {
                        price: number;
                        time: number;
                    };
                    end: {
                        price: number;
                        time: number;
                    };
                }[];
            } = input;

            for (const line of inp.lines) {
                const { x: sX, y: sY } = this.coordsInstance.getCoordinates(line.start.price, line.start.time);
                this.setPoint({ pointId: this.points.length, x: sX, y: sY });
                
                const { x: eX, y: eY } = this.coordsInstance.getCoordinates(line.end.price, line.end.time);
                this.setPoint({ pointId: this.points.length, x: eX, y: eY });
            }
        }
    }

    remove() {
        this.canvasWrapEl.removeEventListener('click', this.mC);
        this.canvasWrapEl.removeEventListener('mousemove', this.mM);
        document.removeEventListener('keydown', this.kD);
        this.canvEl.remove();
    }
}