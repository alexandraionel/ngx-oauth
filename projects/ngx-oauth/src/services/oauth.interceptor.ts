import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {switchMap, take, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {OAuthConfig} from '../models';
import {OAuthTokenService} from './token.service';

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  constructor(protected tokenService: OAuthTokenService,
              protected authConfig: OAuthConfig) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return this.isPathExcepted(req) && next.handle(req) || this.tokenService.token$.pipe(
      take(1),
      map(token => {
        if (token?.access_token) {
          req = req.clone({
            setHeaders: {
              Authorization: `${token.token_type} ${token.access_token}`
            }
          });
        }
        return req;
      }),
      switchMap(req => next.handle(req)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.tokenService.token = {
            error: `${err.status}`,
            error_description: err.message
          };
        }
        return throwError(() => err);
      })
    );
  }

  private isPathExcepted(req: HttpRequest<any>) {
    const {ignorePaths} = this.authConfig || {};
    if (ignorePaths) {
      for (const ignorePath of ignorePaths) {
        try {
          if (req.url.match(ignorePath)) {
            return true;
          }
        } catch (err) {
        }
      }
    }
    return false;
  }
}
