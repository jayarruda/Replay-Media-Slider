using Microsoft.AspNetCore.Builder;

namespace JMSFusion
{
    public static class MiddlewareExtensions
    {
        public static IApplicationBuilder UseJMSFusion(this IApplicationBuilder app) => app;
    }
}
