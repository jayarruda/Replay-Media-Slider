using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace JMSFusion.Core
{

    public sealed class PathRewriteMiddleware
    {
        private readonly RequestDelegate _next;
        private const string From = "/web/slider/";
        private const string To   = "/slider/";

        public PathRewriteMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext ctx)
        {
            var p = ctx.Request.Path.Value;
            if (!string.IsNullOrEmpty(p) &&
                p.StartsWith(From, StringComparison.OrdinalIgnoreCase))
            {
                ctx.Request.Path = new PathString(To + p.Substring(From.Length));
            }

            await _next(ctx);
        }
    }
}
