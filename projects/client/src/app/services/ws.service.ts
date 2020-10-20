import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { filter, map } from 'rxjs/operators';
import { Actions, Store } from '@ngxs/store';
import { isWsActionModel, WsActionModel } from '@prm/shared';
import { environment } from '../../environments/environment';

const successfulActionStatus = 'SUCCESSFUL';

export interface WsResponseAction {
    readonly action: string;

    new(...args: any[]): any;
}

@Injectable({
    providedIn: 'root'
})
export class WsService {
    private webSocket: WebSocketSubject<WsActionModel> = webSocket(environment.wsUrl);

    private readonly actions = new Map<string, WsResponseAction[]>();

    constructor(private store: Store, private actions$: Actions) {
        this.webSocket.subscribe(msg => {
            (this.actions.get(msg.action) || [])
                .forEach(action => this.store.dispatch(new action(msg.data)))
        });
        this.actions$
            .pipe(
                filter((action) => action.status === successfulActionStatus && isWsActionModel(action.action)),
                map(action => action.action)
            )
            .subscribe(action => {
                this.send(action);
            });
    }

    send(action: WsActionModel) {
        this.webSocket.next(action);
    }

    registerActions(actions: WsResponseAction[]) {
        actions
            .forEach(action => {
                const actionKey = action.action;
                if (!this.actions.has(actionKey)) {
                    this.actions.set(actionKey, []);
                }
                this.actions.get(actionKey).push(action);
            })
    }
}
