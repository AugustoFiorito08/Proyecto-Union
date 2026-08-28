using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSolicitudesMembresia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cuit",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Direccion",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailContacto",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HorariosFuncionamiento",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NombreClub",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Telefono",
                table: "ConfiguracionesGenerales",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SolicitudesMembresia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    NumeroSolicitud = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Apellido = table.Column<string>(type: "text", nullable: false),
                    DNI = table.Column<string>(type: "text", nullable: false),
                    FechaNacimiento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Genero = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Telefono = table.Column<string>(type: "text", nullable: true),
                    Domicilio = table.Column<string>(type: "text", nullable: true),
                    Localidad = table.Column<string>(type: "text", nullable: true),
                    Provincia = table.Column<string>(type: "text", nullable: true),
                    CategoriaPretendidaId = table.Column<Guid>(type: "uuid", nullable: true),
                    DocumentoIdentidadUrl = table.Column<string>(type: "text", nullable: true),
                    FichaMedicaUrl = table.Column<string>(type: "text", nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    MotivoRechazo = table.Column<string>(type: "text", nullable: true),
                    Observaciones = table.Column<string>(type: "text", nullable: true),
                    FechaSolicitud = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudesMembresia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitudesMembresia_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitudesMembresia_Categorias_CategoriaPretendidaId",
                        column: x => x.CategoriaPretendidaId,
                        principalTable: "Categorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesMembresia_CategoriaPretendidaId",
                table: "SolicitudesMembresia",
                column: "CategoriaPretendidaId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesMembresia_DNI",
                table: "SolicitudesMembresia",
                column: "DNI",
                unique: true,
                filter: "\"Estado\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesMembresia_NumeroSolicitud",
                table: "SolicitudesMembresia",
                column: "NumeroSolicitud",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesMembresia_UsuarioId",
                table: "SolicitudesMembresia",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitudesMembresia");

            migrationBuilder.DropColumn(
                name: "Cuit",
                table: "ConfiguracionesGenerales");

            migrationBuilder.DropColumn(
                name: "Direccion",
                table: "ConfiguracionesGenerales");

            migrationBuilder.DropColumn(
                name: "EmailContacto",
                table: "ConfiguracionesGenerales");

            migrationBuilder.DropColumn(
                name: "HorariosFuncionamiento",
                table: "ConfiguracionesGenerales");

            migrationBuilder.DropColumn(
                name: "NombreClub",
                table: "ConfiguracionesGenerales");

            migrationBuilder.DropColumn(
                name: "Telefono",
                table: "ConfiguracionesGenerales");
        }
    }
}
