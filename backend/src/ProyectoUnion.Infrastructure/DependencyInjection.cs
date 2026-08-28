using Amazon.S3;
using Amazon.Runtime;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Comunicaciones;
using ProyectoUnion.Infrastructure.ControlAcceso;
using ProyectoUnion.Infrastructure.Finanzas;
using ProyectoUnion.Infrastructure.Identity;
using ProyectoUnion.Infrastructure.MercadoPago;
using ProyectoUnion.Infrastructure.Pdf;
using ProyectoUnion.Infrastructure.Persistence;
using ProyectoUnion.Infrastructure.Persistence.Interceptors;
using ProyectoUnion.Infrastructure.Qr;
using ProyectoUnion.Infrastructure.Storage;

namespace ProyectoUnion.Infrastructure;

/// <summary>
/// Punto único de registro de servicios de Infraestructura: persistencia (EF Core +
/// Npgsql + interceptor de auditoría), Identity, JWT y almacenamiento de objetos (MinIO).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();
        services.AddScoped<AuditSaveChangesInterceptor>();

        services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
            options.AddInterceptors(serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>());
        });

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                // Política de contraseñas — RN-LOG-01 (SPEC.md §3.10): mínimo 8 caracteres,
                // al menos una mayúscula, una minúscula y un número.
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.Password.RequireNonAlphanumeric = false;

                options.User.RequireUniqueEmail = true; // RN-SOC-02, SPEC.md §3.13
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.Configure<MinioOptions>(configuration.GetSection(MinioOptions.SectionName));
        services.AddSingleton<IAmazonS3>(serviceProvider =>
        {
            var minioOptions = configuration.GetSection(MinioOptions.SectionName).Get<MinioOptions>() ?? new MinioOptions();

            var config = new AmazonS3Config
            {
                ServiceURL = minioOptions.Endpoint,
                ForcePathStyle = true, // requerido por MinIO
                UseHttp = !minioOptions.UseSsl
            };

            return new AmazonS3Client(
                new BasicAWSCredentials(minioOptions.AccessKey, minioOptions.SecretKey),
                config);
        });
        services.AddScoped<IArchivoStorageService, MinioArchivoStorageService>();

        // Cifrado en reposo de datos médicos sensibles (RN-SEG-01, SPEC.md §3.12) vía Data
        // Protection API. La ruta es la del volumen Docker ya declarado en docker-compose.yml
        // (persistencia de claves entre reinicios/redeploys del contenedor).
        services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo("/app/dataprotection-keys"))
            .SetApplicationName("ProyectoUnion");

        // Carnet digital + QR (base para Etapa 5, SPEC.md §6).
        services.AddSingleton<IQrCodeGenerator, QrCodeGenerator>();
        services.AddScoped<ICarnetPdfGenerator, CarnetPdfGenerator>();

        // ---- Etapa 3: Finanzas ----
        services.AddScoped<IPagoService, PagoService>();
        services.AddScoped<IReembolsoReservaService, ReembolsoReservaService>();
        services.AddScoped<IMoraSuspensionService, MoraSuspensionService>();
        services.AddScoped<IMercadoPagoClient, MercadoPagoClient>();
        services.AddScoped<IComprobantePdfGenerator, ComprobantePdfGenerator>();

        // ---- Etapa 4: Comunicaciones ----
        services.AddScoped<IEmailSender, EmailSender>();
        services.AddHttpClient<IWhatsAppSender, WhatsAppSender>();
        services.AddScoped<IComunicacionService, ComunicacionService>();
        services.AddScoped<ICumpleanosService, CumpleanosService>();
        services.AddScoped<IRecordatorioVencimientoService, RecordatorioVencimientoService>();

        // ---- Etapa 5: Control de Acceso (QR) ----
        services.AddScoped<IControlAccesoService, ControlAccesoService>();

        return services;
    }
}
